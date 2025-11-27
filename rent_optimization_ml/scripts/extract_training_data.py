"""
Training data extraction utility.

Extracts unit and property data for rent optimization model training.
Includes operating costs, vacancy metrics, maintenance frequency, and location features.

When database connection is available, replace mock data with real queries.
"""

from __future__ import annotations
from datetime import datetime, timedelta

import pandas as pd


def validate_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and clean training data.
    
    Checks:
    - Negative costs (shouldn't exist)
    - Invalid vacancy rates (0-1 range)
    - Missing required fields
    - Cost aggregation consistency
    """
    validated = df.copy()
    
    # Validate operating costs (should be non-negative)
    cost_columns = [
        "maintenance_monthly_avg", "maintenance_yearly_total", "maintenance_per_sqft",
        "taxes_monthly_avg", "taxes_yearly_total", "taxes_per_sqft",
        "insurance_monthly_avg", "insurance_yearly_total", "insurance_per_sqft",
        "repairs_monthly_avg", "repairs_yearly_total", "repairs_per_sqft",
        "other_monthly_avg", "other_yearly_total", "other_per_sqft",
        "total_operating_cost_monthly", "total_operating_cost_yearly", "total_operating_cost_per_sqft",
    ]
    
    for col in cost_columns:
        if col in validated.columns:
            # Replace negative values with 0
            negative_count = (validated[col] < 0).sum()
            if negative_count > 0:
                print(f"Warning: Found {negative_count} negative values in {col}. Setting to 0.")
                validated[col] = validated[col].clip(lower=0)
    
    # Validate vacancy rate (should be between 0 and 1)
    if "vacancy_rate" in validated.columns:
        invalid_vacancy = ((validated["vacancy_rate"] < 0) | (validated["vacancy_rate"] > 1)).sum()
        if invalid_vacancy > 0:
            print(f"Warning: Found {invalid_vacancy} invalid vacancy rates. Clipping to [0, 1].")
            validated["vacancy_rate"] = validated["vacancy_rate"].clip(0, 1)
    
    # Validate maintenance counts (should be non-negative)
    maintenance_cols = ["maintenance_requests_12mo", "maintenance_requests_per_unit"]
    for col in maintenance_cols:
        if col in validated.columns:
            negative_count = (validated[col] < 0).sum()
            if negative_count > 0:
                print(f"Warning: Found {negative_count} negative values in {col}. Setting to 0.")
                validated[col] = validated[col].clip(lower=0)
    
    # Validate cost aggregation consistency (monthly * 12 ≈ yearly, with tolerance)
    if "total_operating_cost_monthly" in validated.columns and "total_operating_cost_yearly" in validated.columns:
        monthly_12x = validated["total_operating_cost_monthly"] * 12
        yearly = validated["total_operating_cost_yearly"]
        # Allow 5% tolerance for rounding differences
        inconsistent = (abs(monthly_12x - yearly) / (yearly + 1)) > 0.05
        if inconsistent.sum() > 0:
            print(f"Warning: Found {inconsistent.sum()} rows with inconsistent monthly/yearly cost aggregation.")
            # Recalculate yearly from monthly if inconsistent
            validated.loc[inconsistent, "total_operating_cost_yearly"] = (
                validated.loc[inconsistent, "total_operating_cost_monthly"] * 12
            )
    
    # Log data availability statistics
    print("\nData Availability Statistics:")
    print(f"Total samples: {len(validated)}")
    
    if "total_operating_cost_monthly" in validated.columns:
        has_costs = validated["total_operating_cost_monthly"].notna().sum()
        print(f"Samples with operating cost data: {has_costs} ({has_costs/len(validated)*100:.1f}%)")
    
    if "vacancy_rate" in validated.columns:
        has_vacancy = validated["vacancy_rate"].notna().sum()
        print(f"Samples with vacancy data: {has_vacancy} ({has_vacancy/len(validated)*100:.1f}%)")
    
    if "maintenance_requests_12mo" in validated.columns:
        has_maintenance = validated["maintenance_requests_12mo"].notna().sum()
        print(f"Samples with maintenance data: {has_maintenance} ({has_maintenance/len(validated)*100:.1f}%)")
    
    return validated


def fetch_sample_training_data() -> pd.DataFrame:
    """
    Fetch training data with operating costs and additional factors.
    
    Returns DataFrame with columns:
    - Basic unit features: bedrooms, bathrooms, square_feet, current_rent, achieved_rent
    - Operating costs: maintenance, taxes, insurance, repairs, other (monthly avg, yearly total, per sqft)
    - Vacancy metrics: vacancy_rate
    - Maintenance: maintenance_requests_12mo, maintenance_requests_per_unit, maintenance_frequency_bucket
    - Location: property_age, city, state, zip_code, properties_in_city_count
    - Market: market_competition_score
    """
    # Mock data with new features
    # In production, this would query the database
    data = [
        {
            # Basic unit features
            "bedrooms": 1,
            "bathrooms": 1,
            "square_feet": 650,
            "current_rent": 1500,
            "achieved_rent": 1600,
            # Operating costs (monthly averages)
            "maintenance_monthly_avg": 120.0,
            "maintenance_yearly_total": 1440.0,
            "maintenance_per_sqft": 0.185,
            "taxes_monthly_avg": 200.0,
            "taxes_yearly_total": 2400.0,
            "taxes_per_sqft": 0.308,
            "insurance_monthly_avg": 150.0,
            "insurance_yearly_total": 1800.0,
            "insurance_per_sqft": 0.231,
            "repairs_monthly_avg": 80.0,
            "repairs_yearly_total": 960.0,
            "repairs_per_sqft": 0.123,
            "other_monthly_avg": 50.0,
            "other_yearly_total": 600.0,
            "other_per_sqft": 0.077,
            "total_operating_cost_monthly": 600.0,
            "total_operating_cost_yearly": 7200.0,
            "total_operating_cost_per_sqft": 0.923,
            # Vacancy & Maintenance
            "vacancy_rate": 0.05,
            "maintenance_requests_12mo": 8,
            "maintenance_requests_per_unit": 0.8,
            "maintenance_frequency_bucket": 1,  # 0=low, 1=medium, 2=high
            # Location & Property
            "property_age": 15,
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "properties_in_city_count": 1250,
            # Market competition
            "market_competition_score": 0.65,
        },
        {
            "bedrooms": 2,
            "bathrooms": 1,
            "square_feet": 900,
            "current_rent": 2000,
            "achieved_rent": 2150,
            "maintenance_monthly_avg": 150.0,
            "maintenance_yearly_total": 1800.0,
            "maintenance_per_sqft": 0.167,
            "taxes_monthly_avg": 250.0,
            "taxes_yearly_total": 3000.0,
            "taxes_per_sqft": 0.278,
            "insurance_monthly_avg": 180.0,
            "insurance_yearly_total": 2160.0,
            "insurance_per_sqft": 0.200,
            "repairs_monthly_avg": 100.0,
            "repairs_yearly_total": 1200.0,
            "repairs_per_sqft": 0.111,
            "other_monthly_avg": 70.0,
            "other_yearly_total": 840.0,
            "other_per_sqft": 0.078,
            "total_operating_cost_monthly": 750.0,
            "total_operating_cost_yearly": 9000.0,
            "total_operating_cost_per_sqft": 0.833,
            "vacancy_rate": 0.03,
            "maintenance_requests_12mo": 5,
            "maintenance_requests_per_unit": 0.5,
            "maintenance_frequency_bucket": 0,
            "property_age": 8,
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "properties_in_city_count": 1250,
            "market_competition_score": 0.65,
        },
        {
            "bedrooms": 3,
            "bathrooms": 2,
            "square_feet": 1250,
            "current_rent": 2400,
            "achieved_rent": 2650,
            "maintenance_monthly_avg": 200.0,
            "maintenance_yearly_total": 2400.0,
            "maintenance_per_sqft": 0.160,
            "taxes_monthly_avg": 350.0,
            "taxes_yearly_total": 4200.0,
            "taxes_per_sqft": 0.280,
            "insurance_monthly_avg": 220.0,
            "insurance_yearly_total": 2640.0,
            "insurance_per_sqft": 0.176,
            "repairs_monthly_avg": 130.0,
            "repairs_yearly_total": 1560.0,
            "repairs_per_sqft": 0.104,
            "other_monthly_avg": 100.0,
            "other_yearly_total": 1200.0,
            "other_per_sqft": 0.080,
            "total_operating_cost_monthly": 1000.0,
            "total_operating_cost_yearly": 12000.0,
            "total_operating_cost_per_sqft": 0.800,
            "vacancy_rate": 0.02,
            "maintenance_requests_12mo": 12,
            "maintenance_requests_per_unit": 1.2,
            "maintenance_frequency_bucket": 2,
            "property_age": 25,
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98102",
            "properties_in_city_count": 1250,
            "market_competition_score": 0.70,
        },
        {
            "bedrooms": 2,
            "bathrooms": 2,
            "square_feet": 1100,
            "current_rent": 2300,
            "achieved_rent": 2450,
            "maintenance_monthly_avg": 180.0,
            "maintenance_yearly_total": 2160.0,
            "maintenance_per_sqft": 0.164,
            "taxes_monthly_avg": 300.0,
            "taxes_yearly_total": 3600.0,
            "taxes_per_sqft": 0.273,
            "insurance_monthly_avg": 200.0,
            "insurance_yearly_total": 2400.0,
            "insurance_per_sqft": 0.182,
            "repairs_monthly_avg": 110.0,
            "repairs_yearly_total": 1320.0,
            "repairs_per_sqft": 0.100,
            "other_monthly_avg": 80.0,
            "other_yearly_total": 960.0,
            "other_per_sqft": 0.073,
            "total_operating_cost_monthly": 870.0,
            "total_operating_cost_yearly": 10440.0,
            "total_operating_cost_per_sqft": 0.791,
            "vacancy_rate": 0.04,
            "maintenance_requests_12mo": 6,
            "maintenance_requests_per_unit": 0.6,
            "maintenance_frequency_bucket": 1,
            "property_age": 12,
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "properties_in_city_count": 1250,
            "market_competition_score": 0.68,
        },
    ]
    
    df = pd.DataFrame(data)
    # Validate the data before returning
    return validate_training_data(df)


def fetch_from_database() -> pd.DataFrame:
    """
    Fetch training data from PostgreSQL database.
    
    This function should be implemented when database connection is available.
    It should query:
    - Unit table for basic features
    - Expense table for operating costs (MAINTENANCE, TAXES, INSURANCE, REPAIRS, OTHER)
    - Lease table for vacancy calculations
    - MaintenanceRequest table for maintenance frequency
    - Property table for location and age
    
    Returns:
        DataFrame with all training features
    """
    # TODO: Implement database queries
    # Example structure:
    # import psycopg2
    # from psycopg2.extras import RealDictCursor
    # 
    # conn = psycopg2.connect(...)
    # 
    # # Query operating costs
    # expense_query = """
    #     SELECT 
    #         propertyId,
    #         category,
    #         SUM(amount) as total_amount,
    #         COUNT(*) as expense_count
    #     FROM Expense
    #     WHERE category IN ('MAINTENANCE', 'TAXES', 'INSURANCE', 'REPAIRS', 'OTHER')
    #       AND date >= CURRENT_DATE - INTERVAL '12 months'
    #     GROUP BY propertyId, category
    # """
    # 
    # # Query vacancy rate
    # vacancy_query = """
    #     SELECT 
    #         p.id as propertyId,
    #         COUNT(DISTINCT u.id) as total_units,
    #         COUNT(DISTINCT l.id) as active_leases
    #     FROM Property p
    #     LEFT JOIN Unit u ON u.propertyId = p.id
    #     LEFT JOIN Lease l ON l.unitId = u.id AND l.status = 'ACTIVE'
    #     GROUP BY p.id
    # """
    # 
    # # Similar queries for maintenance requests, location features, etc.
    # 
    # return pd.DataFrame(...)
    
    # For now, return sample data
    df = fetch_sample_training_data()
    # Validate the data before returning
    return validate_training_data(df)


def main() -> None:
    df = fetch_sample_training_data()
    print(df.head())


if __name__ == "__main__":
    main()
