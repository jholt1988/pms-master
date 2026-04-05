import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json

def generate_historical_occupancy(years=10, properties=50):
    """
    Generates realistic historical time-series data replicating occupancy rates,
    seasonality, market demand fluctuations, and maintenance events.
    """
    print(f"Generating {years} years of historical data for {properties} properties...")
    
    start_date = datetime.now() - timedelta(days=365 * years)
    date_range = pd.date_range(start=start_date, end=datetime.now(), freq='W') # Weekly data
    
    data = []
    
    for prop_id in range(1, properties + 1):
        # Base stats per property
        base_rent = np.random.uniform(1200, 3500)
        base_occupancy = np.random.uniform(0.85, 0.98)
        maintenance_quality = np.random.uniform(0.1, 1.0) # 1.0 is highest quality/fewest issues
        
        for date_point in date_range:
            # Seasonality: higher demand in Summer (months 5-8)
            month = date_point.month
            seasonality_factor = 1.05 if 5 <= month <= 8 else 0.95 if month in [11, 12, 1] else 1.0
            
            # Market cycle: 7-9 year boom/bust cycles (sine wave)
            elapsed_days = (date_point - start_date).days
            market_cycle = 1.0 + 0.15 * np.sin(elapsed_days / (365 * 4)) 
            
            # Maintenance impact: random spikes in unaddressed maintenance decreases occupancy
            maintenance_spike = np.random.choice([0, 1], p=[0.95, 0.05])
            if maintenance_spike == 1:
                maintenance_issues = int(np.random.normal(5, 2) * (1.1 - maintenance_quality))
            else:
                maintenance_issues = int(np.random.normal(1, 0.5) * (1.1 - maintenance_quality))
            maintenance_issues = max(0, maintenance_issues)

            # Calculate actuals
            current_occupancy = min(base_occupancy * seasonality_factor * np.random.normal(1.0, 0.02), 1.0)
            if maintenance_issues > 3: current_occupancy *= 0.9 # Drop in occupancy due to issues
            
            # Target variable (Churn Probability) for the next model
            churn_risk = min(1.0, max(0.0, 0.05 + (maintenance_issues * 0.08) - (current_occupancy - 0.9)))

            target_rent = base_rent * market_cycle * seasonality_factor
            
            data.append({
                'date': date_point.isoformat(),
                'property_id': prop_id,
                'occupancy_rate': round(current_occupancy, 3),
                'market_demand_index': round(market_cycle * seasonality_factor, 3),
                'maintenance_tickets_open': maintenance_issues,
                'avg_rent_achieved': round(target_rent, 2),
                'target_churn_probability': round(churn_risk, 3)
            })

    df = pd.DataFrame(data)
    
    os.makedirs('app/assets', exist_ok=True)
    file_path = 'app/assets/historical_occupancy.csv'
    df.to_csv(file_path, index=False)
    print(f"Data generated successfully: {file_path} ({len(df)} records)")
    
    # Save a schema definition mapping Phase 1 Stream -> ML Feature
    schema_map = {
         "phase1_event_stream": "payment.success",
         "mapped_ml_feature": "tenant_payment_reliability_score",
         "phase1_iot_stream": "maintenance.ticket.created",
         "mapped_ml_feature": "maintenance_tickets_open",
    }
    with open('app/assets/schema_map.json', 'w') as f:
         json.dump(schema_map, f, indent=4)

if __name__ == "__main__":
    generate_historical_occupancy()
