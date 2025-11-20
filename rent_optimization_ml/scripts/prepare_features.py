"""
Feature engineering utilities for the rent optimization model.

Keeps a lightweight, dependency-friendly workflow so developers can run
the pipeline locally without heavy infrastructure.
"""

from __future__ import annotations

import pandas as pd


def add_basic_features(df: pd.DataFrame) -> pd.DataFrame:
    engineered = df.copy()
    engineered["rent_per_sqft"] = engineered["achieved_rent"] / engineered["square_feet"]
    engineered["bath_per_bed"] = engineered["bathrooms"] / engineered["bedrooms"].clip(lower=1)
    engineered["size_bucket"] = pd.qcut(engineered["square_feet"], q=4, labels=False, duplicates="drop")
    return engineered


def main() -> None:
    sample = pd.DataFrame(
        [
            {"bedrooms": 2, "bathrooms": 1, "square_feet": 900, "achieved_rent": 2150},
            {"bedrooms": 3, "bathrooms": 2, "square_feet": 1250, "achieved_rent": 2650},
        ]
    )
    print(add_basic_features(sample))


if __name__ == "__main__":
    main()
