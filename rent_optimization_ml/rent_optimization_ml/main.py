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


@app.post("/predict", response_model=PredictionResponse)
async def predict(payload: PredictionRequest) -> PredictionResponse:
    return await prediction_service.predict(payload)


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(payload: BatchPredictionRequest) -> BatchPredictionResponse:
    if not payload.__root__:
        raise HTTPException(status_code=400, detail="No payloads provided")

    tasks: List[asyncio.Task[PredictionResponse]] = [
        asyncio.create_task(prediction_service.predict(item)) for item in payload
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
