import asyncio
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
    ModelInfo,
    PredictionRequest,
    PredictionResponse,
)
from app.services.prediction_service import PredictionService

settings = get_settings()
app = FastAPI(
    title="Rent Optimization ML",
    version=settings.model_version,
    description="Digital Twin ML microservice for rent recommendations",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prediction_service = PredictionService(settings)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        model_version=settings.model_version,
        timestamp=datetime.now(timezone.utc),
        loaded_model=prediction_service.model_loader.model is not None,
    )


@app.get("/model/info", response_model=ModelInfo)
async def model_info() -> ModelInfo:
    return ModelInfo(
        model_version=settings.model_version,
        ready=prediction_service.model_loader.model is not None,
        features=[
            "bedrooms",
            "bathrooms",
            "square_feet",
            "current_rent",
            "amenities",
            "market_comps",
        ],
    )


from pydantic import BaseModel, Field

class YieldPricingRequest(BaseModel):
    occupancy_rate: float = Field(..., description="Current occupancy rate (0-1)")
    market_demand_index: float = Field(..., description="Market demand scalar")
    maintenance_tickets_open: int = Field(..., description="Unresolved maintenance issues")

class YieldPricingResponse(BaseModel):
    recommended_rent_adjustment: float
    target_rent: float
    confidence_score: float

class ChurnPredictionRequest(BaseModel):
    tenant_id: str
    property_id: str
    occupancy_rate: float
    maintenance_tickets_open: int
    days_to_lease_end: int

class ChurnPredictionResponse(BaseModel):
    churn_probability: float
    risk_level: str
    recommended_action: str

@app.post("/predict", response_model=PredictionResponse)
async def predict(payload: PredictionRequest) -> PredictionResponse:
    return await prediction_service.predict(payload)

@app.post("/predict/pricing", response_model=YieldPricingResponse)
async def predict_dynamic_pricing(payload: YieldPricingRequest) -> YieldPricingResponse:
    """
    Airline-style yield management model.
    Given high demand/occupancy, returns a positive rent adjustment.
    """
    base_rent = 2000.0
    adjustment_factor = 1.0

    if payload.occupancy_rate > 0.95 and payload.market_demand_index > 1.0:
        adjustment_factor = 1.15
    elif payload.occupancy_rate < 0.85:
        adjustment_factor = 0.90

    # Local anomaly threshold: Do not allow rent to spike excessively
    target = base_rent * adjustment_factor
    max_allowable_rent = base_rent * 1.25
    target = min(target, max_allowable_rent)

    return YieldPricingResponse(
        recommended_rent_adjustment=target - base_rent,
        target_rent=target,
        confidence_score=0.89
    )

@app.post("/predict/churn", response_model=ChurnPredictionResponse)
async def predict_churn(payload: ChurnPredictionRequest) -> ChurnPredictionResponse:
    """
    Resident Churn predictor tracking maintenance delays against lease limits.
    """
    prob = 0.05 + (payload.maintenance_tickets_open * 0.1)
    
    if payload.days_to_lease_end < 60:
        prob += 0.3
        
    prob = min(prob, 0.99)
    
    risk = "LOW"
    action = "None needed"
    if prob > 0.7:
        risk = "HIGH"
        action = "Dispatch maintenance immediately and offer $50 renewal credit."
    elif prob > 0.4:
        risk = "MEDIUM"
        action = "Automated check-in email."

    return ChurnPredictionResponse(
        churn_probability=round(prob, 3),
        risk_level=risk,
        recommended_action=action
    )


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(payload: BatchPredictionRequest) -> BatchPredictionResponse:
    if not payload.root:
        raise HTTPException(status_code=400, detail="No payloads provided")

    tasks: List[asyncio.Task[PredictionResponse]] = [
        asyncio.create_task(prediction_service.predict(item)) for item in payload.root
    ]
    results = await asyncio.gather(*tasks)
    return BatchPredictionResponse(results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
