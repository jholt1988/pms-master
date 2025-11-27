"""
Lightweight training script for the rent optimization model.

Uses scikit-learn so the project remains dependency-light. Swap in
XGBoost if desired; keep the interface consistent for the loader.
"""

from __future__ import annotations

import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

# Add parent directory to path to allow imports
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.extract_training_data import fetch_sample_training_data
from scripts.prepare_features import add_basic_features


def train(output_path: Path | None = None) -> None:
    """
    Train the rent prediction model.
    
    Args:
        output_path: Optional path to save the model. Defaults to models/rent_predictor.joblib
                    relative to the project root.
    """
    if output_path is None:
        output_path = PROJECT_ROOT / "models" / "rent_predictor.joblib"
    
    # Load and prepare data
    data = fetch_sample_training_data()
    
    if data.empty:
        raise ValueError("No training data available. Check data extraction.")
    
    if len(data) < 10:
        print(f"Warning: Only {len(data)} samples available. Model may not perform well.")
        print("Consider adding more training data for better results.")
    
    data = add_basic_features(data)

    # Define features (excluding rent_per_sqft if it uses target variable)
    # Note: rent_per_sqft should use current_rent, not achieved_rent, to avoid data leakage
    feature_cols = ["bedrooms", "bathrooms", "square_feet", "bath_per_bed"]
    
    # Only include size_bucket if we have enough data for meaningful buckets
    if len(data) >= 4 and "size_bucket" in data.columns:
        feature_cols.append("size_bucket")
    
    # Only include rent_per_sqft if it's based on current_rent, not achieved_rent
    if "rent_per_sqft" in data.columns and "current_rent" in data.columns:
        # Verify it's not using achieved_rent (data leakage check)
        # This should be handled in prepare_features.py, but double-check here
        feature_cols.append("rent_per_sqft")
    
    # Operating cost features (high priority)
    operating_cost_features = [
        "total_operating_cost_per_sqft",
        "operating_cost_to_rent_ratio",
        "maintenance_to_rent_ratio",
        "cost_efficiency_score",
    ]
    for feat in operating_cost_features:
        if feat in data.columns:
            feature_cols.append(feat)
    
    # Vacancy and maintenance features (medium priority)
    vacancy_maintenance_features = [
        "vacancy_rate",
        "vacancy_adjusted_rent",
        "maintenance_requests_per_unit",
        "maintenance_frequency_bucket",
        "maintenance_cost_per_request",
        "maintenance_burden",
    ]
    for feat in vacancy_maintenance_features:
        if feat in data.columns:
            feature_cols.append(feat)
    
    # Location and property features (medium priority)
    location_features = [
        "property_age",
        "property_age_bucket",
        "city_encoded",
        "state_encoded",
        "market_competition_score",
    ]
    for feat in location_features:
        if feat in data.columns:
            feature_cols.append(feat)
    
    # Individual operating cost categories (lower priority, include if available)
    cost_category_features = [
        "maintenance_per_sqft",
        "taxes_per_sqft",
        "insurance_per_sqft",
        "repairs_per_sqft",
    ]
    for feat in cost_category_features:
        if feat in data.columns:
            feature_cols.append(feat)
    
    # Check all required columns exist
    missing_cols = [col for col in feature_cols if col not in data.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    if "achieved_rent" not in data.columns:
        raise ValueError("Target variable 'achieved_rent' not found in data")
    
    X = data[feature_cols]
    y = data["achieved_rent"]
    
    # Check for missing values
    if X.isnull().sum().sum() > 0:
        print("Warning: Missing values detected in features. Filling with median.")
        X = X.fillna(X.median())
    
    if y.isnull().sum() > 0:
        print("Warning: Missing values detected in target. Dropping rows.")
        mask = ~y.isnull()
        X = X[mask]
        y = y[mask]
    
    if len(X) < 2:
        raise ValueError(f"Insufficient data after cleaning: {len(X)} samples. Need at least 2.")
    
    # Adjust test size for small datasets
    test_size = 0.25 if len(X) >= 8 else 0.2 if len(X) >= 5 else 0.0
    
    if test_size > 0:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
    else:
        # Use all data for training if too small for split
        X_train, X_test = X, X
        y_train, y_test = y, y
        print("Warning: Dataset too small for train/test split. Using all data for training.")
    
    # Train model
    model = RandomForestRegressor(n_estimators=min(120, len(X_train) * 10), random_state=42)
    model.fit(X_train, y_train)

    # Feature importance analysis
    if hasattr(model, "feature_importances_"):
        feature_importance = pd.DataFrame({
            "feature": feature_cols,
            "importance": model.feature_importances_,
        }).sort_values("importance", ascending=False)
        
        print("\nTop 10 Most Important Features:")
        print(feature_importance.head(10).to_string(index=False))
        
        # Log which operating cost features are most important
        operating_cost_importance = feature_importance[
            feature_importance["feature"].str.contains("operating|cost|maintenance|vacancy", case=False, na=False)
        ]
        if len(operating_cost_importance) > 0:
            print("\nOperating Cost & Related Feature Importance:")
            print(operating_cost_importance.to_string(index=False))

    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"\nValidation MAE: ${mae:.2f}")
    
    if len(X_test) > 0:
        # Calculate MAPE, avoiding division by zero
        # Filter out zero values to avoid division by zero
        # Convert to pandas Series if needed for indexing
        y_test_series = pd.Series(y_test) if not isinstance(y_test, pd.Series) else y_test
        preds_series = pd.Series(preds) if not isinstance(preds, pd.Series) else preds
        
        non_zero_mask = y_test_series != 0
        if non_zero_mask.sum() > 0:
            y_test_nonzero = y_test_series[non_zero_mask]
            preds_nonzero = preds_series[non_zero_mask]
            mape = (abs(y_test_nonzero - preds_nonzero) / y_test_nonzero).mean() * 100
            print(f"Validation MAPE: {mape:.2f}%")
        else:
            print("Validation MAPE: Cannot calculate (all target values are zero)")
    
    # Save model
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    print(f"Model saved to {output_path.resolve()}")


if __name__ == "__main__":
    train()
