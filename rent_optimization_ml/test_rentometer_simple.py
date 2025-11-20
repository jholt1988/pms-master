import asyncio

from app.config import get_settings
from app.models.schemas import PredictionRequest
from app.services.prediction_service import PredictionService


def test_prediction_flow_end_to_end():
    service = PredictionService(get_settings())
    payload = PredictionRequest(
        unit_id="simple-1",
        property_type="APARTMENT",
        bedrooms=2,
        bathrooms=1,
        square_feet=900,
        address="123 Main St",
        city="Portland",
        state="OR",
        zip_code="97201",
        current_rent=1900,
    )
    result = asyncio.run(service.predict(payload))
    assert result.recommended_rent > 0
    assert result.confidence_interval_low < result.confidence_interval_high
