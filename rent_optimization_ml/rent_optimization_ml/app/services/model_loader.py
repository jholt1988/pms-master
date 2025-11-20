from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import numpy as np

from app.config import Settings


class ModelLoader:
    """Responsible for loading and using the trained model if available."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = self._load_model(settings.model_path)

    def _load_model(self, path: Path) -> Optional[Any]:
        if not path:
            return None
        expanded = path.expanduser()
        if not expanded.exists():
            return None

        try:
            if expanded.suffix in {".pkl", ".joblib"}:
                return joblib.load(expanded)
            return pickle.loads(expanded.read_bytes())
        except Exception as exc:  # noqa: BLE001
            # Failed to load model; service will fall back to heuristic mode.
            print(f"[ModelLoader] Failed to load model at {expanded}: {exc}")
            return None

    def predict(self, features: Dict[str, Any]) -> float:
        """
        Predict rent using the loaded model or a deterministic heuristic.

        The heuristic provides stable output when no trained model is present.
        """
        if self.model is not None:
            try:
                feature_vector = np.array(
                    [
                        features.get("bedrooms", 0),
                        features.get("bathrooms", 0),
                        features.get("square_feet", 0),
                        features.get("current_rent", 0),
                    ]
                ).reshape(1, -4)
                prediction = float(self.model.predict(feature_vector)[0])
                return prediction
            except Exception as exc:  # noqa: BLE001
                print(f"[ModelLoader] Model predict failed, falling back: {exc}")

        # Heuristic fallback
        base = float(features.get("current_rent", 0))
        bedrooms = float(features.get("bedrooms", 0))
        bathrooms = float(features.get("bathrooms", 0))
        sqft = float(features.get("square_feet", 0))

        size_factor = 0.35 * (sqft / 1000)
        bed_factor = 0.12 * bedrooms
        bath_factor = 0.08 * bathrooms
        baseline = max(base, 1200.0)
        return baseline * (1 + size_factor + bed_factor + bath_factor)
