import random
from typing import List
import httpx
import logging

from app.config import Settings
from app.models.schemas import ComparableProperty, PredictionRequest

logger = logging.getLogger(__name__)

class MarketDataService:
    """Fetches market data from external APIs (Rentometer) with fallback to local heuristics."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch_comparables(self, request: PredictionRequest) -> List[ComparableProperty]:
        if not self.settings.use_market_data:
            return []

        # If a real Rentometer API key is set (and not the placeholder)
        if self.settings.rentometer_api_key and self.settings.rentometer_api_key != "your_rentometer_api_key_here":
            try:
                full_address = f"{request.address}, {request.city}, {request.state} {request.zip_code}"
                params = {
                    "address": full_address,
                    "bedrooms": request.bedrooms,
                    "api_key": self.settings.rentometer_api_key
                }
                if request.bathrooms:
                    params["bathrooms"] = request.bathrooms

                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.rentometer.com/v1/summary",
                        params=params,
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        mean_val = data.get("mean")
                        min_val = data.get("min")
                        max_val = data.get("max")
                        
                        if mean_val is not None:
                            # Generate a set of properties based on summary stats
                            return [
                                ComparableProperty(
                                    id="rentometer-min",
                                    address=f"Near {request.address}",
                                    price=float(min_val or (mean_val * 0.85)),
                                    distance_miles=0.2,
                                    bedrooms=request.bedrooms,
                                    bathrooms=request.bathrooms,
                                    square_feet=request.square_feet,
                                ),
                                ComparableProperty(
                                    id="rentometer-avg",
                                    address=f"Near {request.address}",
                                    price=float(mean_val),
                                    distance_miles=0.4,
                                    bedrooms=request.bedrooms,
                                    bathrooms=request.bathrooms,
                                    square_feet=request.square_feet,
                                ),
                                ComparableProperty(
                                    id="rentometer-max",
                                    address=f"Near {request.address}",
                                    price=float(max_val or (mean_val * 1.15)),
                                    distance_miles=0.6,
                                    bedrooms=request.bedrooms,
                                    bathrooms=request.bathrooms,
                                    square_feet=request.square_feet,
                                )
                            ]
                    logger.warning(f"Rentometer API returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Failed to fetch from Rentometer API: {e}", exc_info=True)

        # Fallback to local heuristic / mock data
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

