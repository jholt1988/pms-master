import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import os

def train_yield_optimization_model():
    """
    Trains a dynamic pricing model based on airline yield management principles.
    Goal: Maximize Revenue = Price * Occupancy.
    If demand/occupancy is high, raise prices. If low, drop prices dynamically.
    """
    print("Loading historical data...")
    file_path = 'app/assets/historical_occupancy.csv'
    if not os.path.exists(file_path):
        print("Data not found. Run generate_mock_occupancy_data.py first.")
        return

    df = pd.read_csv(file_path)
    
    # Feature Engineering
    # Features: current occupancy, market demand, open maintenance tickets
    X = df[['occupancy_rate', 'market_demand_index', 'maintenance_tickets_open']]
    y = df['avg_rent_achieved'] # Target: The optimal rent achieved under these conditions
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Dynamic Yield Model (RandomForest)...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model R^2 Score Validation: {score:.3f}")
    
    os.makedirs('models', exist_ok=True)
    model_path = 'models/dynamic_yield_model.joblib'
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_yield_optimization_model()
