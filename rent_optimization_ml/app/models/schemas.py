from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ComparableProperty(BaseModel):
    id: str
    address: str
    price: float
    distance_miles: float
    bedrooms: int
    bathrooms: float
    square_feet: int


class PredictionFactors(BaseModel):
    name: str
    impact_percentage: float
    description: str


class PredictionRequest(BaseModel):
    unit_id: str
    property_type: str = Field(default="APARTMENT")
    bedrooms: int
    bathrooms: float
    square_feet: int
    address: str
    city: str
    state: str
    zip_code: str
    current_rent: float
    has_parking: bool | None = None
    has_laundry: bool | None = None
    has_pool: bool | None = None
    has_gym: bool | None = None
    has_hvac: bool | None = None
    is_furnished: bool | None = None
    pets_allowed: bool | None = None
    year_built: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    floor_number: int | None = None


class PredictionResponse(BaseModel):
    unit_id: str
    current_rent: float
    recommended_rent: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence_score: float
    factors: List[PredictionFactors]
    market_comparables: List[ComparableProperty] = []
    reasoning: str
    model_version: str
    generated_at: datetime
    market_trend: str = "flat"
    seasonality_factor: float = 1.0


class BatchPredictionRequest(BaseModel):
    __root__: List[PredictionRequest]

    def __iter__(self):
        return iter(self.__root__)


class BatchPredictionResponse(BaseModel):
    results: List[PredictionResponse]


class HealthResponse(BaseModel):
    status: str = "ok"
    model_version: str
    timestamp: datetime
    loaded_model: bool


class ModelInfo(BaseModel):
    model_version: str
    trained_on: Optional[str] = None
    features: List[str] = []
    ready: bool = False
