from __future__ import annotations

import random
from typing import List

from app.config import Settings
from app.models.schemas import ComparableProperty, PredictionRequest


class MarketDataService:
    """Lightweight stub for market data. Replace with real API calls when keys are configured."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch_comparables(self, request: PredictionRequest) -> List[ComparableProperty]:
        if not self.settings.use_market_data:
            return []

        base_price = request.current_rent or 2000
        random.seed(request.unit_id)

        def sample(offset: float, idx: int) -> ComparableProperty:
            return ComparableProperty(
                id=f"comp-{idx}",
                address=f"{100 + idx} {request.city} Ave",
                price=round(base_price * (1 + offset), 2),
                distance_miles=round(0.3 + 0.4 * idx, 2),
                bedrooms=request.bedrooms,
                bathrooms=request.bathrooms,
                square_feet=request.square_feet,
            )

        return [
            sample(offset, idx)
            for idx, offset in enumerate(
                [random.uniform(-0.05, 0.08), random.uniform(-0.08, 0.06), random.uniform(-0.03, 0.1)]
            )
        ]
