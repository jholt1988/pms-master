import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os
import numpy as np

def train_churn_model():
    """
    Trains a Resident Churn Predictor model.
    Predicts if a tenant is highly likely to break their lease or not renew.
    """
    print("Loading historical data for churn prediction...")
    file_path = 'app/assets/historical_occupancy.csv'
    if not os.path.exists(file_path):
        print("Data not found. Run generate_mock_occupancy_data.py first.")
        return

    df = pd.read_csv(file_path)
    
    # Feature Engineering
    # Features: current occupancy (property health), maintenance issues
    X = df[['occupancy_rate', 'maintenance_tickets_open']]
    
    # Target: Convert target_churn_probability to binary classification (1 = Churn, 0 = Stay)
    # Thresholding at 0.5 for demonstration
    y = (df['target_churn_probability'] > 0.5).astype(int) 
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Churn Prediction Model (RandomForestClassifier)...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"Model Accuracy Validation: {accuracy * 100:.2f}%")
    
    os.makedirs('models', exist_ok=True)
    model_path = 'models/churn_prediction_model.joblib'
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_churn_model()
