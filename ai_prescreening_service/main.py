from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

# Database connection details should be in environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "pms")
DB_USER = os.getenv("DB_USER", "user")
DB_PASS = os.getenv("DB_PASS", "password")

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    return conn

class ApplicationReviewRequest(BaseModel):
    application_id: str

class ReviewResult(BaseModel):
    recommendation: str
    summary: str
    checks_passed: int
    checks_total: int

@app.post("/review", response_model=ReviewResult)
async def review_application(request: ApplicationReviewRequest):
    """
    Receives a rental application ID, fetches its data,
    and returns an AI-powered pre-screening recommendation.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch application data and related property data in one go
            # This query is a placeholder and needs to be adapted to the actual schema
            cur.execute("""
                SELECT
                    ra.id,
                    ra.data->>'monthly_income' as monthly_income,
                    p.rent_amount
                FROM rental_applications ra
                JOIN properties p ON (ra.data->>'property_id')::uuid = p.id
                WHERE ra.id = %s;
            """, (request.application_id,))
            
            application_data = cur.fetchone()

        if not application_data:
            raise HTTPException(status_code=404, detail="Application not found")

        # --- AI/Business Logic Rules ---
        checks = []
        
        # 1. Income to Rent Ratio (must be >= 3x)
        try:
            monthly_income = float(application_data.get('monthly_income', 0))
            rent_amount = float(application_data.get('rent_amount', 0))
            
            if rent_amount > 0 and monthly_income >= (rent_amount * 3):
                checks.append("Income is sufficient (>= 3x rent).")
            else:
                checks.append("FAIL: Income is less than 3x rent.")
        except (ValueError, TypeError):
            checks.append("FAIL: Could not verify income-to-rent ratio.")

        # --- Generate Summary & Recommendation ---
        passed_count = sum(1 for check in checks if "FAIL" not in check)
        total_count = len(checks)
        summary = "\n".join(f"- {check}" for check in checks)
        
        recommendation = "needs_review"
        if passed_count == total_count:
            recommendation = "approve"
        elif "FAIL" in summary:
            recommendation = "deny"

        return ReviewResult(
            recommendation=recommendation,
            summary=summary,
            checks_passed=passed_count,
            checks_total=total_count,
        )

    except Exception as e:
        # Log the error properly in a real application
        print(f"Error processing application {request.application_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during review.")
    finally:
        if conn:
            conn.close()

@app.get("/health")
async def health_check():
    return {"status": "ok"}
