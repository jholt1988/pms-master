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
    
    Queries:
    - Unit table for basic features (bedrooms, bathrooms, square_feet, etc.)
    - Expense table for operating costs (MAINTENANCE, TAXES, INSURANCE, REPAIRS, OTHER)
    - Lease table for vacancy calculations and rent amounts
    - MaintenanceRequest table for maintenance frequency
    - Property table for location and age
    
    Requires:
    - DATABASE_URL environment variable set to PostgreSQL connection string
    - psycopg2 library installed (pip install psycopg2-binary)
    
    Returns:
        DataFrame with all training features matching the format from fetch_sample_training_data()
        
    Example DATABASE_URL format:
        postgresql://username:password@localhost:5432/database_name?schema=public
    """
    import os
    
    # Check if psycopg2 is available
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("Error: psycopg2 not installed. Install it with: pip install psycopg2-binary")
        print("Falling back to sample data.")
        return validate_training_data(fetch_sample_training_data())
    
    # Get database URL from environment variable
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Warning: DATABASE_URL environment variable not set. Using sample data.")
        return validate_training_data(fetch_sample_training_data())
    
    try:
        # Parse and clean DATABASE_URL - remove schema parameter that psycopg2 doesn't understand
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        
        parsed = urlparse(database_url)
        query_params = parse_qs(parsed.query, keep_blank_values=True)
        
        # Remove 'schema' parameter if present (Prisma uses it, but psycopg2 doesn't)
        query_params.pop('schema', None)
        
        # Rebuild URL without schema parameter
        if query_params:
            cleaned_query = urlencode(query_params, doseq=True)
        else:
            cleaned_query = ''
            
        cleaned_url = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            cleaned_query,
            parsed.fragment
        ))
        
        # Connect to database with cleaned URL
        # If URL ends with '?' or has empty query, remove it
        if cleaned_url.endswith('?'):
            cleaned_url = cleaned_url[:-1]
            
        conn = psycopg2.connect(cleaned_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Main query: Get unit data with property, lease, and aggregated metrics
        main_query = """
        WITH unit_base AS (
            SELECT 
                u.id as unit_id,
                u."propertyId",
                u."unitNumber",
                u.bedrooms,
                u.bathrooms,
                u."squareFeet",
                u."hasParking",
                u."hasLaundry",
                u."hasBalcony",
                u."hasAC",
                u."isFurnished",
                u."petsAllowed",
                -- Property features
                p.name as property_name,
                p.city,
                p.state,
                p."zipCode" as zip_code,
                p."yearBuilt",
                p."propertyType",
                p.latitude,
                p.longitude,
                -- Current lease info
                l.id as lease_id,
                l."rentAmount" as current_rent,
                l.status as lease_status,
                l."startDate" as lease_start_date,
                l."endDate" as lease_end_date,
                -- Calculate property age
                CASE 
                    WHEN p."yearBuilt" IS NOT NULL 
                    THEN EXTRACT(YEAR FROM CURRENT_DATE) - p."yearBuilt"
                    ELSE NULL
                END as property_age
            FROM "Unit" u
            INNER JOIN "Property" p ON u."propertyId" = p.id
            LEFT JOIN "Lease" l ON u.id = l."unitId" AND l.status = 'ACTIVE'
        ),
        expense_agg AS (
            SELECT 
                COALESCE(e."unitId", e."propertyId") as id,
                COALESCE(e."unitId" IS NOT NULL, false) as is_unit_level,
                SUM(CASE WHEN e.category = 'MAINTENANCE' THEN e.amount ELSE 0 END) as maintenance_yearly_total,
                SUM(CASE WHEN e.category = 'TAXES' THEN e.amount ELSE 0 END) as taxes_yearly_total,
                SUM(CASE WHEN e.category = 'INSURANCE' THEN e.amount ELSE 0 END) as insurance_yearly_total,
                SUM(CASE WHEN e.category = 'REPAIRS' THEN e.amount ELSE 0 END) as repairs_yearly_total,
                SUM(CASE WHEN e.category = 'OTHER' THEN e.amount ELSE 0 END) as other_yearly_total,
                COUNT(CASE WHEN e.category = 'MAINTENANCE' THEN 1 END) as maintenance_count,
                COUNT(CASE WHEN e.category = 'TAXES' THEN 1 END) as taxes_count,
                COUNT(CASE WHEN e.category = 'INSURANCE' THEN 1 END) as insurance_count,
                COUNT(CASE WHEN e.category = 'REPAIRS' THEN 1 END) as repairs_count,
                COUNT(CASE WHEN e.category = 'OTHER' THEN 1 END) as other_count
            FROM "Expense" e
            WHERE e.date >= CURRENT_DATE - INTERVAL '12 months'
              AND e.category IN ('MAINTENANCE', 'TAXES', 'INSURANCE', 'REPAIRS', 'OTHER')
            GROUP BY COALESCE(e."unitId", e."propertyId"), COALESCE(e."unitId" IS NOT NULL, false)
        ),
        maintenance_req_counts AS (
            SELECT 
                COALESCE(mr."unitId", mr."propertyId") as id,
                COALESCE(mr."unitId" IS NOT NULL, false) as is_unit_level,
                COUNT(*) as maintenance_requests_12mo
            FROM "MaintenanceRequest" mr
            WHERE mr."createdAt" >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY COALESCE(mr."unitId", mr."propertyId"), COALESCE(mr."unitId" IS NOT NULL, false)
        ),
        vacancy_rates AS (
            SELECT 
                p.id as property_id,
                COUNT(DISTINCT u.id) as total_units,
                COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN l.id END) as active_leases,
                CASE 
                    WHEN COUNT(DISTINCT u.id) > 0 
                    THEN 1.0 - (COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN l.id END)::float / COUNT(DISTINCT u.id))
                    ELSE 0.0
                END as vacancy_rate
            FROM "Property" p
            LEFT JOIN "Unit" u ON u."propertyId" = p.id
            LEFT JOIN "Lease" l ON l."unitId" = u.id
            GROUP BY p.id
        ),
        city_property_counts AS (
            SELECT 
                city,
                state,
                COUNT(DISTINCT id) as properties_in_city_count
            FROM "Property"
            WHERE city IS NOT NULL AND state IS NOT NULL
            GROUP BY city, state
        )
        SELECT 
            ub.unit_id,
            ub.bedrooms,
            ub.bathrooms,
            ub."squareFeet" as square_feet,
            COALESCE(ub.current_rent, 0) as current_rent,
            COALESCE(ub.current_rent, 0) as achieved_rent,  -- Use current rent as achieved rent if no historical data
            -- Operating costs (use unit-level if available, otherwise property-level)
            COALESCE(
                (SELECT maintenance_yearly_total FROM expense_agg WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT maintenance_yearly_total FROM expense_agg WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as maintenance_yearly_total,
            COALESCE(
                (SELECT taxes_yearly_total FROM expense_agg WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT taxes_yearly_total FROM expense_agg WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as taxes_yearly_total,
            COALESCE(
                (SELECT insurance_yearly_total FROM expense_agg WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT insurance_yearly_total FROM expense_agg WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as insurance_yearly_total,
            COALESCE(
                (SELECT repairs_yearly_total FROM expense_agg WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT repairs_yearly_total FROM expense_agg WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as repairs_yearly_total,
            COALESCE(
                (SELECT other_yearly_total FROM expense_agg WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT other_yearly_total FROM expense_agg WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as other_yearly_total,
            -- Vacancy rate (property-level)
            COALESCE(vr.vacancy_rate, 0.0) as vacancy_rate,
            -- Maintenance request counts
            COALESCE(
                (SELECT maintenance_requests_12mo FROM maintenance_req_counts WHERE id = ub.unit_id AND is_unit_level = true),
                (SELECT maintenance_requests_12mo FROM maintenance_req_counts WHERE id = ub."propertyId" AND is_unit_level = false),
                0
            ) as maintenance_requests_12mo,
            -- Location and property features
            COALESCE(ub.property_age, 0) as property_age,
            COALESCE(ub.city, 'Unknown') as city,
            COALESCE(ub.state, 'Unknown') as state,
            COALESCE(ub.zip_code, 'Unknown') as zip_code,
            COALESCE(cpc.properties_in_city_count, 1) as properties_in_city_count,
            -- Market competition score (placeholder - could be calculated from nearby properties)
            0.5 as market_competition_score
        FROM unit_base ub
        LEFT JOIN vacancy_rates vr ON ub."propertyId" = vr.property_id
        LEFT JOIN city_property_counts cpc ON ub.city = cpc.city AND ub.state = cpc.state
        WHERE ub."squareFeet" IS NOT NULL 
          AND ub."squareFeet" > 0
          AND ub.bedrooms IS NOT NULL
        ORDER BY ub.unit_id
        """
        
        cur.execute(main_query)
        rows = cur.fetchall()
        
        if not rows:
            print("Warning: No data found in database. Using sample data.")
            cur.close()
            conn.close()
            return validate_training_data(fetch_sample_training_data())
        
        # Convert to DataFrame
        df = pd.DataFrame(rows)
        
        # Calculate monthly averages and per-square-foot metrics
        df['maintenance_monthly_avg'] = df['maintenance_yearly_total'] / 12.0
        df['taxes_monthly_avg'] = df['taxes_yearly_total'] / 12.0
        df['insurance_monthly_avg'] = df['insurance_yearly_total'] / 12.0
        df['repairs_monthly_avg'] = df['repairs_yearly_total'] / 12.0
        df['other_monthly_avg'] = df['other_yearly_total'] / 12.0
        
        # Calculate per-square-foot metrics
        df['maintenance_per_sqft'] = df['maintenance_yearly_total'] / df['square_feet'].replace(0, 1)
        df['taxes_per_sqft'] = df['taxes_yearly_total'] / df['square_feet'].replace(0, 1)
        df['insurance_per_sqft'] = df['insurance_yearly_total'] / df['square_feet'].replace(0, 1)
        df['repairs_per_sqft'] = df['repairs_yearly_total'] / df['square_feet'].replace(0, 1)
        df['other_per_sqft'] = df['other_yearly_total'] / df['square_feet'].replace(0, 1)
        
        # Calculate total operating costs
        df['total_operating_cost_monthly'] = (
            df['maintenance_monthly_avg'] + 
            df['taxes_monthly_avg'] + 
            df['insurance_monthly_avg'] + 
            df['repairs_monthly_avg'] + 
            df['other_monthly_avg']
        )
        df['total_operating_cost_yearly'] = df['total_operating_cost_monthly'] * 12.0
        df['total_operating_cost_per_sqft'] = df['total_operating_cost_yearly'] / df['square_feet'].replace(0, 1)
        
        # Calculate maintenance requests per unit (for property-level aggregation)
        # This is already unit-level in the query, but we can calculate per-unit for properties
        df['maintenance_requests_per_unit'] = df['maintenance_requests_12mo']
        
        # Calculate maintenance frequency bucket (0=low, 1=medium, 2=high)
        maintenance_counts = df['maintenance_requests_12mo'].fillna(0)
        df['maintenance_frequency_bucket'] = 0  # Default to low
        df.loc[maintenance_counts > 3, 'maintenance_frequency_bucket'] = 1  # Medium
        df.loc[maintenance_counts > 8, 'maintenance_frequency_bucket'] = 2  # High
        df['maintenance_frequency_bucket'] = df['maintenance_frequency_bucket'].astype(int)
        
        # Clean up any remaining NaN values
        numeric_cols = df.select_dtypes(include=[float, int]).columns
        df[numeric_cols] = df[numeric_cols].fillna(0)
        
        # Select and order columns to match expected format
        columns_order = [
            'bedrooms', 'bathrooms', 'square_feet', 'current_rent', 'achieved_rent',
            'maintenance_monthly_avg', 'maintenance_yearly_total', 'maintenance_per_sqft',
            'taxes_monthly_avg', 'taxes_yearly_total', 'taxes_per_sqft',
            'insurance_monthly_avg', 'insurance_yearly_total', 'insurance_per_sqft',
            'repairs_monthly_avg', 'repairs_yearly_total', 'repairs_per_sqft',
            'other_monthly_avg', 'other_yearly_total', 'other_per_sqft',
            'total_operating_cost_monthly', 'total_operating_cost_yearly', 'total_operating_cost_per_sqft',
            'vacancy_rate',
            'maintenance_requests_12mo', 'maintenance_requests_per_unit', 'maintenance_frequency_bucket',
            'property_age', 'city', 'state', 'zip_code', 'properties_in_city_count',
            'market_competition_score'
        ]
        
        # Only select columns that exist
        available_columns = [col for col in columns_order if col in df.columns]
        result_df: pd.DataFrame = pd.DataFrame(df[available_columns].copy())
        
        cur.close()
        conn.close()
        
        print(f"Successfully fetched {len(result_df)} units from database")
        
        # Validate and return
        validated_df = validate_training_data(result_df)
        return validated_df
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        print("Falling back to sample data.")
        return validate_training_data(fetch_sample_training_data())
    except Exception as e:
        print(f"Error fetching from database: {e}")
        print("Falling back to sample data.")
        return validate_training_data(fetch_sample_training_data())


def main() -> None:
    """Main function to test data extraction."""
    import os
    
    # Check if DATABASE_URL is set
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        print("DATABASE_URL found. Attempting to fetch from database...")
        try:
            df = fetch_from_database()
            print(f"\nFetched {len(df)} rows from database")
            print("\nFirst 5 rows:")
            print(df.head())
            print("\nData summary:")
            print(df.describe())
        except Exception as e:
            print(f"Error: {e}")
            print("\nFalling back to sample data...")
            df = fetch_sample_training_data()
            print(f"\nUsing {len(df)} sample rows")
            print("\nFirst 5 rows:")
            print(df.head())
    else:
        print("DATABASE_URL not set. Using sample data...")
        df = fetch_sample_training_data()
        print(f"\nUsing {len(df)} sample rows")
        print("\nFirst 5 rows:")
        print(df.head())


if __name__ == "__main__":
    main()
