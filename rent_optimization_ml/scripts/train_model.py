"""
Lightweight training script for the rent optimization model.

Uses scikit-learn so the project remains dependency-light. Swap in
XGBoost if desired; keep the interface consistent for the loader.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

from scripts.extract_training_data import fetch_sample_training_data
from scripts.prepare_features import add_basic_features


def train(output_path: Path = Path("./models/rent_predictor.joblib")) -> None:
    data = fetch_sample_training_data()
    data = add_basic_features(data)

    feature_cols = ["bedrooms", "bathrooms", "square_feet", "rent_per_sqft", "bath_per_bed", "size_bucket"]
    X = data[feature_cols]
    y = data["achieved_rent"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    model = RandomForestRegressor(n_estimators=120, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Validation MAE: {mae:.2f}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    print(f"Model saved to {output_path.resolve()}")


if __name__ == "__main__":
    train()
