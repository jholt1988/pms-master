"""
Feature engineering utilities for the rent optimization model.

Keeps a lightweight, dependency-friendly workflow so developers can run
the pipeline locally without heavy infrastructure.
"""

from __future__ import annotations
from datetime import datetime

import pandas as pd


def add_basic_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add engineered features for rent optimization model.
    
    Includes:
    - Basic unit features (rent_per_sqft, bath_per_bed, size_bucket)
    - Operating cost features (ratios, efficiency scores)
    - Vacancy impact features
    - Maintenance impact features
    - Location encoding
    - Property age buckets
    """
    engineered = df.copy()
    
    # Basic unit features
    # Use current_rent, not achieved_rent, to avoid data leakage
    # rent_per_sqft should be a feature based on existing rent, not the target we're predicting
    if "current_rent" in engineered.columns and "square_feet" in engineered.columns:
        engineered["rent_per_sqft"] = engineered["current_rent"] / engineered["square_feet"]
    
    engineered["bath_per_bed"] = engineered["bathrooms"] / engineered["bedrooms"].clip(lower=1)
    
    # Size bucket with error handling
    if len(engineered) >= 4:
        try:
            engineered["size_bucket"] = pd.qcut(
                engineered["square_feet"], q=4, labels=False, duplicates="drop"
            )
        except ValueError:
            # If not enough unique values, use simple binning
            engineered["size_bucket"] = pd.cut(
                engineered["square_feet"], bins=4, labels=False, duplicates="drop"
            )
    
    # Operating cost features
    if "total_operating_cost_monthly" in engineered.columns and "current_rent" in engineered.columns:
        # Operating cost to rent ratio (lower is better)
        engineered["operating_cost_to_rent_ratio"] = (
            engineered["total_operating_cost_monthly"] / engineered["current_rent"].clip(lower=1)
        )
    
    if "maintenance_monthly_avg" in engineered.columns and "current_rent" in engineered.columns:
        # Maintenance to rent ratio
        engineered["maintenance_to_rent_ratio"] = (
            engineered["maintenance_monthly_avg"] / engineered["current_rent"].clip(lower=1)
        )
    
    if "total_operating_cost_per_sqft" in engineered.columns:
        # Cost efficiency score (higher is better, inverse of cost per sqft)
        engineered["cost_efficiency_score"] = 1 / (engineered["total_operating_cost_per_sqft"] + 0.01)
    
    # Vacancy impact features
    if "vacancy_rate" in engineered.columns and "current_rent" in engineered.columns:
        # Vacancy penalty (lost revenue)
        engineered["vacancy_penalty"] = engineered["vacancy_rate"] * engineered["current_rent"]
        # Vacancy-adjusted rent (effective revenue)
        engineered["vacancy_adjusted_rent"] = engineered["current_rent"] * (1 - engineered["vacancy_rate"])
    
    # Maintenance impact features
    if "maintenance_monthly_avg" in engineered.columns and "maintenance_requests_12mo" in engineered.columns:
        # Maintenance cost per request
        engineered["maintenance_cost_per_request"] = (
            engineered["maintenance_monthly_avg"] / engineered["maintenance_requests_12mo"].clip(lower=1)
        )
    
    if "maintenance_requests_per_unit" in engineered.columns and "maintenance_monthly_avg" in engineered.columns:
        # Maintenance burden (requests per unit * monthly cost)
        engineered["maintenance_burden"] = (
            engineered["maintenance_requests_per_unit"] * engineered["maintenance_monthly_avg"]
        )
    
    # Property age buckets
    if "property_age" in engineered.columns:
        def age_bucket(age: float) -> int:
            """Categorize property age: 0=new (<5yr), 1=recent (5-15yr), 2=established (15-30yr), 3=old (>30yr)"""
            if pd.isna(age):
                return 1  # Default to recent
            if age < 5:
                return 0
            elif age < 15:
                return 1
            elif age < 30:
                return 2
            else:
                return 3
        
        engineered["property_age_bucket"] = engineered["property_age"].apply(age_bucket)
    
    # Location encoding (simple label encoding for now)
    # In production, could use one-hot encoding or more sophisticated methods
    if "city" in engineered.columns:
        unique_cities = engineered["city"].unique()
        city_codes = {city: idx for idx, city in enumerate(unique_cities)}
        engineered["city_encoded"] = engineered["city"].apply(lambda x: city_codes.get(x, -1))
    
    if "state" in engineered.columns:
        unique_states = engineered["state"].unique()
        state_codes = {state: idx for idx, state in enumerate(unique_states)}
        engineered["state_encoded"] = engineered["state"].apply(lambda x: state_codes.get(x, -1))
    
    # Market competition score normalization (if available)
    if "market_competition_score" in engineered.columns:
        # Already normalized 0-1, but ensure it's in valid range
        engineered["market_competition_score"] = engineered["market_competition_score"].clip(0, 1)
    
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
