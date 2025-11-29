# Database Training Data Extraction Guide

**Status:** ✅ IMPLEMENTED

The `fetch_from_database()` function has been fully implemented to extract real training data from your PostgreSQL database.

---

## Overview

The `fetch_from_database()` function queries your Property Management Suite database to extract comprehensive training data for the rent optimization ML model. It aggregates data from multiple tables to create a complete feature set.

---

## What Data is Extracted

### Basic Unit Features
- `bedrooms`, `bathrooms`, `square_feet`
- `current_rent` (from active lease)
- `achieved_rent` (same as current_rent, can be enhanced with historical data)

### Operating Costs (Last 12 Months)
- **Maintenance**: Monthly avg, yearly total, per sqft
- **Taxes**: Monthly avg, yearly total, per sqft
- **Insurance**: Monthly avg, yearly total, per sqft
- **Repairs**: Monthly avg, yearly total, per sqft
- **Other**: Monthly avg, yearly total, per sqft
- **Total**: Monthly avg, yearly total, per sqft

### Vacancy Metrics
- `vacancy_rate`: Calculated from active leases vs total units per property

### Maintenance Frequency
- `maintenance_requests_12mo`: Count of requests in last 12 months
- `maintenance_requests_per_unit`: Requests per unit
- `maintenance_frequency_bucket`: 0=low, 1=medium, 2=high

### Location & Property Features
- `property_age`: Calculated from yearBuilt
- `city`, `state`, `zip_code`
- `properties_in_city_count`: Total properties in same city
- `market_competition_score`: Placeholder (0.5), can be enhanced

---

## Requirements

### 1. Install Dependencies

```bash
pip install psycopg2-binary pandas
```

### 2. Set Environment Variable

Set the `DATABASE_URL` environment variable to your PostgreSQL connection string:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://username:password@localhost:5432/tenant_portal?schema=public"

# Linux/Mac
export DATABASE_URL="postgresql://username:password@localhost:5432/tenant_portal?schema=public"

# Or create .env file in rent_optimization_ml/ directory
DATABASE_URL=postgresql://username:password@localhost:5432/tenant_portal?schema=public
```

**Connection String Format:**
```
postgresql://[username]:[password]@[host]:[port]/[database]?schema=public
```

---

## Usage

### Basic Usage

```python
from scripts.extract_training_data import fetch_from_database

# Fetch data from database
df = fetch_from_database()

# Use the DataFrame for training
print(f"Fetched {len(df)} units")
print(df.head())
```

### Command Line

```bash
cd rent_optimization_ml
python scripts/extract_training_data.py
```

The script will:
1. Check for `DATABASE_URL` environment variable
2. Connect to database if available
3. Extract training data
4. Display summary statistics
5. Fall back to sample data if database unavailable

---

## Data Aggregation Logic

### Operating Costs
- **Unit-level expenses** are preferred (if `unitId` is set)
- Falls back to **property-level expenses** if unit-level not available
- Aggregates all expenses in last 12 months by category

### Vacancy Rate Calculation
```
vacancy_rate = 1 - (active_leases / total_units)
```
- Calculated at property level
- Uses ACTIVE lease status only

### Maintenance Frequency Buckets
- **Low (0)**: 0-3 requests per year
- **Medium (1)**: 4-8 requests per year  
- **High (2)**: 9+ requests per year

---

## Query Details

The function uses a comprehensive SQL query with CTEs (Common Table Expressions) to:

1. **unit_base**: Get basic unit and property info with current lease
2. **expense_agg**: Aggregate expenses by category (unit or property level)
3. **maintenance_req_counts**: Count maintenance requests in last 12 months
4. **vacancy_rates**: Calculate vacancy rates per property
5. **city_property_counts**: Count properties per city for market context

All data is joined and aggregated into a single DataFrame matching the format expected by the ML model.

---

## Error Handling

The function gracefully handles:

- ✅ Missing `DATABASE_URL` → Falls back to sample data
- ✅ Missing `psycopg2` library → Falls back to sample data with helpful message
- ✅ Database connection errors → Falls back to sample data
- ✅ Empty result sets → Falls back to sample data
- ✅ Missing columns → Only selects available columns
- ✅ Missing values → Fills with 0 or default values

---

## Validation

All extracted data is automatically validated using `validate_training_data()`:

- ✅ Negative costs → Clipped to 0
- ✅ Invalid vacancy rates → Clipped to [0, 1]
- ✅ Missing values → Filled appropriately
- ✅ Cost consistency → Monthly/yearly totals verified

---

## Output Format

The function returns a pandas DataFrame with these columns (in order):

```
bedrooms, bathrooms, square_feet, current_rent, achieved_rent,
maintenance_monthly_avg, maintenance_yearly_total, maintenance_per_sqft,
taxes_monthly_avg, taxes_yearly_total, taxes_per_sqft,
insurance_monthly_avg, insurance_yearly_total, insurance_per_sqft,
repairs_monthly_avg, repairs_yearly_total, repairs_per_sqft,
other_monthly_avg, other_yearly_total, other_per_sqft,
total_operating_cost_monthly, total_operating_cost_yearly, total_operating_cost_per_sqft,
vacancy_rate,
maintenance_requests_12mo, maintenance_requests_per_unit, maintenance_frequency_bucket,
property_age, city, state, zip_code, properties_in_city_count,
market_competition_score
```

---

## Testing

Test the extraction:

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/tenant_portal"

# Run extraction
python scripts/extract_training_data.py
```

Expected output:
```
DATABASE_URL found. Attempting to fetch from database...
Successfully fetched 26 units from database

Fetched 26 rows from database

First 5 rows:
   bedrooms  bathrooms  square_feet  current_rent  ...
0         1        1.0         425         725.0  ...
1         1        1.0         425         700.0  ...
...

Data summary:
         bedrooms    bathrooms  square_feet  ...
count   26.000000   26.000000   26.000000   ...
mean     1.461538    1.153846  725.384615   ...
...
```

---

## Integration with Training

Use in your training scripts:

```python
from scripts.extract_training_data import fetch_from_database

# Get real-world training data
training_df = fetch_from_database()

# Proceed with model training
# ... your training code ...
```

---

## Future Enhancements

Possible improvements:

1. **Historical Rent Data**: Use Invoice table to calculate actual `achieved_rent` over time
2. **Market Competition Score**: Calculate from nearby properties using latitude/longitude
3. **More Granular Costs**: Break down expenses by specific sub-categories
4. **Time-based Features**: Include seasonal trends, month-over-month changes
5. **Property Features**: Include amenities, property type details
6. **Unit Features**: Include hasParking, hasLaundry, etc. as separate features

---

**Status:** ✅ Ready for Production Use  
**Next:** Extract data and train the ML model with real-world data!

