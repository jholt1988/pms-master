"""
Simple utility to mock training data extraction.

Replace the placeholder logic with a real database query when wiring up
to Postgres. The goal here is to give developers a ready-to-run script
that does not depend on external systems.
"""

from __future__ import annotations

import pandas as pd


def fetch_sample_training_data() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"bedrooms": 1, "bathrooms": 1, "square_feet": 650, "current_rent": 1500, "achieved_rent": 1600},
            {"bedrooms": 2, "bathrooms": 1, "square_feet": 900, "current_rent": 2000, "achieved_rent": 2150},
            {"bedrooms": 3, "bathrooms": 2, "square_feet": 1250, "current_rent": 2400, "achieved_rent": 2650},
            {"bedrooms": 2, "bathrooms": 2, "square_feet": 1100, "current_rent": 2300, "achieved_rent": 2450},
        ]
    )


def main() -> None:
    df = fetch_sample_training_data()
    print(df.head())


if __name__ == "__main__":
    main()
