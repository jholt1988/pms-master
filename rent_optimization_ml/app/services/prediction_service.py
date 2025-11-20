from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean
from typing import List, Tuple

from app.config import Settings
from app.models.schemas import (
    ComparableProperty,
    PredictionFactors,
    PredictionRequest,
    PredictionResponse,
)
from app.services.market_data_service import MarketDataService
from app.services.model_loader import ModelLoader


class PredictionService:
    """Coordinates feature prep, model inference, and market context."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model_loader = ModelLoader(settings)
        self.market_data = MarketDataService(settings)

    async def predict(self, payload: PredictionRequest) -> PredictionResponse:
        comparables = await self.market_data.fetch_comparables(payload)
        model_rent = self.model_loader.predict(payload.model_dump())

        market_signal = self._market_signal(payload.current_rent, comparables)
        recommended = max(model_rent * market_signal, payload.current_rent * 0.85)

        ci_low, ci_high = self._confidence_interval(recommended)
        factors = self._factors(payload, comparables, model_rent, recommended)

        return PredictionResponse(
            unit_id=payload.unit_id,
            current_rent=payload.current_rent,
            recommended_rent=round(recommended, 2),
            confidence_interval_low=round(ci_low, 2),
            confidence_interval_high=round(ci_high, 2),
            confidence_score=0.82 if comparables else 0.68,
            factors=factors,
            market_comparables=comparables,
            reasoning="Recommendation blends model output, market comps, and amenity heuristics.",
            model_version=self.settings.model_version,
            generated_at=datetime.now(timezone.utc),
            market_trend="rising" if market_signal > 1 else "flat",
            seasonality_factor=1.05 if self.settings.use_seasonal_adjustment else 1.0,
        )

    def _market_signal(self, current_rent: float, comparables: List[ComparableProperty]) -> float:
        if not comparables:
            return 1.0
        market_avg = mean([c.price for c in comparables])
        if current_rent <= 0:
            return 1.0
        delta = (market_avg - current_rent) / current_rent
        return 1 + max(min(delta, 0.12), -0.12)

    def _confidence_interval(self, recommended: float) -> Tuple[float, float]:
        spread = max(recommended * 0.08, 80.0)
        return recommended - spread, recommended + spread

    def _factors(
        self,
        payload: PredictionRequest,
        comparables: List[ComparableProperty],
        model_rent: float,
        recommended: float,
    ) -> List[PredictionFactors]:
        comps_text = (
            f"{len(comparables)} comps avg ${mean(c.price for c in comparables):.0f}"
            if comparables
            else "No live comps; using heuristic"
        )
        amenity_count = sum(
            bool(flag)
            for flag in [
                payload.has_gym,
                payload.has_pool,
                payload.has_parking,
                payload.has_laundry,
                payload.has_hvac,
            ]
        )
        return [
            PredictionFactors(
                name="Model Baseline",
                impact_percentage=round((recommended - payload.current_rent) / max(payload.current_rent, 1) * 100, 2),
                description=f"Model suggested ${model_rent:.0f} before adjustments.",
            ),
            PredictionFactors(
                name="Market Comparison",
                impact_percentage=5.0 if comparables else 0.0,
                description=comps_text,
            ),
            PredictionFactors(
                name="Amenities",
                impact_percentage=min(amenity_count * 2.5, 12.0),
                description=f"{amenity_count} premium amenities considered.",
            ),
        ]
