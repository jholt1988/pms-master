# ML Model Training Scripts

This directory contains scripts for training the rent prediction ML model.

## Workflow

### 1. Extract Training Data

Extract unit and rent data from PostgreSQL database:

```cmd
cd rent_optimization_ml
venv\Scripts\activate
python scripts\extract_training_data.py
```

This creates:
- `data/raw_data_latest.csv` - Raw unit and rent data
- Analysis of data quality and distributions

### 2. Prepare Features

Engineer features and prepare data for training:

```cmd
python scripts\prepare_features.py
```

This creates:
- `data/engineered_data_latest.csv` - Data with engineered features
- `data/X_features.csv` - Feature matrix
- `data/y_target.csv` - Target variable (rent)
- `data/feature_names.txt` - List of feature names

Features include:

**Basic Unit Features:**
- Property characteristics (bedrooms, bathrooms, square_feet)
- Derived features (rent_per_sqft, bath_per_bed, size_bucket)

**Operating Cost Features:**
- Maintenance costs (monthly avg, yearly total, per sqft)
- Taxes (monthly avg, yearly total, per sqft)
- Insurance (monthly avg, yearly total, per sqft)
- Repairs (monthly avg, yearly total, per sqft)
- Other expenses (monthly avg, yearly total, per sqft)
- Total operating costs (monthly, yearly, per sqft)
- Cost ratios (operating_cost_to_rent_ratio, maintenance_to_rent_ratio)
- Cost efficiency score

**Vacancy & Maintenance Features:**
- Vacancy rate (property-level occupancy)
- Vacancy-adjusted rent (effective revenue)
- Vacancy penalty (lost revenue)
- Maintenance request frequency (12-month count, per unit)
- Maintenance frequency bucket (low/medium/high)
- Maintenance cost per request
- Maintenance burden (requests × cost)

**Location & Property Features:**
- Property age (years since built)
- Property age bucket (new/recent/established/old)
- Location encoding (city, state)
- Market competition score
- Properties in city count

**Data Requirements:**
- Operating costs: Expense table with categories MAINTENANCE, TAXES, INSURANCE, REPAIRS, OTHER
- Vacancy: Unit and Lease tables (status = 'ACTIVE')
- Maintenance: MaintenanceRequest table (last 12 months)
- Location: Property table (city, state, zipCode, yearBuilt)

### 3. Train Model

Train XGBoost regression model:

```cmd
python scripts\train_model.py
```

This creates:
- `models/rent_predictor.joblib` - Trained XGBoost model
- `models/model_metadata.json` - Model version, metrics, features
- `models/feature_importance.csv` - Feature importance scores
- `plots/predictions_vs_actuals.png` - Visualization
- `plots/residuals.png` - Residual analysis

### 4. Restart ML Service

After training, restart the ML service to load the new model:

```cmd
# Stop current service (Ctrl+C)
python main.py
```

The service will automatically load `models/rent_predictor.joblib` if it exists.

## Model Evaluation

The training script reports:

- **MAE** (Mean Absolute Error) - Average prediction error in dollars
- **MAPE** (Mean Absolute Percentage Error) - Error as percentage
- **Feature Importance** - Top 10 most important features
- **Operating Cost Feature Importance** - Which cost metrics are most predictive

Target metrics:
- MAE < $100 (excellent)
- MAE < $150 (good)
- R² > 0.80 (strong predictive power)

The model now includes feature importance analysis to identify which operating cost and market factors most influence rent predictions.

## Hyperparameter Tuning

To enable hyperparameter tuning, uncomment the section in `train_model.py`:

```python
# Uncomment these lines
logger.info("\nStarting hyperparameter tuning...")
model, best_params = hyperparameter_tuning(X_train, y_train, quick=True)
```

Set `quick=False` for comprehensive search (slower but better results).

## Retraining

Retrain the model periodically (monthly recommended) to incorporate new data:

```cmd
# Full pipeline
python scripts\extract_training_data.py
python scripts\prepare_features.py
python scripts\train_model.py
```

## Troubleshooting

**No data extracted**:
- Check PostgreSQL connection in `.env`
- Verify units and leases exist in database
- Run seed script if needed

**Poor model performance**:
- Check data quality (missing values, outliers)
- Ensure sufficient training samples (>100 recommended)
- Verify operating cost data availability (>50% of properties recommended)
- Check feature importance to identify which features are most useful
- Try hyperparameter tuning
- Add more features or improve feature engineering

**Missing operating cost data**:
- The model handles missing cost data with median imputation
- Properties without expense records will use imputed values
- Consider collecting expense data for better model accuracy
- Check Expense table for records in last 12 months

**Model won't load**:
- Verify `models/rent_predictor.joblib` exists
- Check file permissions
- Ensure XGBoost version matches (currently 2.0.3)

## File Structure

```
rent_optimization_ml/
├── scripts/
│   ├── extract_training_data.py    # Step 1: Get data from DB
│   ├── prepare_features.py         # Step 2: Feature engineering
│   ├── train_model.py              # Step 3: Train XGBoost
│   └── README.md                   # This file
├── data/                           # Training data (created)
│   ├── raw_data_latest.csv
│   ├── engineered_data_latest.csv
│   ├── X_features.csv
│   ├── y_target.csv
│   └── feature_names.txt
├── models/                         # Trained models (created)
│   ├── rent_predictor.joblib
│   ├── model_metadata.json
│   └── feature_importance.csv
└── plots/                          # Visualizations (created)
    ├── predictions_vs_actuals.png
    └── residuals.png
```

## Operating Cost Calculation Methodology

Operating costs are aggregated at the property level from the Expense table:

1. **Time Window**: Last 12 months of expense records
2. **Categories**: MAINTENANCE, TAXES, INSURANCE, REPAIRS, OTHER (UTILITIES excluded)
3. **Aggregations**:
   - Monthly average: Total expenses / 12 months
   - Yearly total: Sum of all expenses in 12-month window
   - Per square foot: Total cost / property total square footage

4. **Validation**:
   - Negative costs are clipped to 0
   - Monthly × 12 should approximately equal yearly total (5% tolerance)
   - Missing data is handled with median imputation by property type/city

## Data Validation

The extraction script includes automatic validation:

- **Cost Validation**: Ensures no negative operating costs
- **Vacancy Validation**: Clips vacancy rates to [0, 1] range
- **Maintenance Validation**: Ensures non-negative request counts
- **Aggregation Validation**: Checks monthly/yearly cost consistency
- **Data Availability Logging**: Reports percentage of samples with each data type

## Next Steps

After successfully training and deploying the model:

1. Monitor prediction quality in production
2. Collect user feedback on recommendations
3. A/B test against baseline predictions
4. Retrain monthly with new data
5. Monitor feature importance to identify most predictive factors
6. Collect more operating cost data to improve model accuracy
7. Consider unit-level operating costs if data becomes available
8. Experiment with time-series features (cost trends over time)
