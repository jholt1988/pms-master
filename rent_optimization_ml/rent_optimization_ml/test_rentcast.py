import asyncio

from app.config import get_settings
from app.models.schemas import PredictionRequest
from app.services.market_data_service import MarketDataService


def test_market_data_returns_comps():
    settings = get_settings()
    settings.use_market_data = True
    service = MarketDataService(settings)
    sample = PredictionRequest(
        unit_id="test-123",
        property_type="APARTMENT",
        bedrooms=2,
        bathrooms=1,
        square_feet=850,
        address="123 Main St",
        city="Seattle",
        state="WA",
        zip_code="98101",
        current_rent=2100,
    )
    comps = asyncio.run(service.fetch_comparables(sample))
    assert len(comps) >= 1
