"""
Placeholder sanity-check for rentometer integration.

Keeps the CLI callable while real API credentials are not configured.
"""

from __future__ import annotations

from pprint import pprint

from app.config import get_settings
from app.models.schemas import PredictionRequest
from app.services.market_data_service import MarketDataService


async def main() -> None:
    settings = get_settings()
    service = MarketDataService(settings)
    sample = PredictionRequest(
        unit_id="rentometer-demo",
        property_type="APARTMENT",
        bedrooms=2,
        bathrooms=1,
        square_feet=900,
        address="123 Main St",
        city="Austin",
        state="TX",
        zip_code="78701",
        current_rent=1950,
    )
    comps = await service.fetch_comparables(sample)
    pprint([c.model_dump() for c in comps])


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
