from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import random

app = FastAPI(title="AI Prescreening Edge Service")

# Database connection details
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "pms")
DB_USER = os.getenv("DB_USER", "pms")
DB_PASS = os.getenv("DB_PASS", "pms")

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)

# --- Pydantic Schemas for AI Prescreening ---

class BiometricData(BaseModel):
    photo_id_base64: str
    selfie_video_base64: str
    liveness_verification: bool

class IdentityReviewRequest(BaseModel):
    applicant_id: str
    ssn_last_four: str
    biometrics: BiometricData

class IdentityFraudScore(BaseModel):
    fraud_risk_score: int = Field(..., ge=0, le=100) # 0 is perfectly safe, 100 is definite fraud
    factors: List[str]
    is_verified: bool

class PlaidTransaction(BaseModel):
    amount: float
    date: str
    name: str
    category: List[str]

class PlaidFinancialPayload(BaseModel):
    applicant_id: str
    plaid_item_id: str
    transactions_30d: List[PlaidTransaction]
    current_balance: float

class FinancialReviewResult(BaseModel):
    income_to_rent_ratio: float
    bounced_checks_detected: int
    recommendation: str
    summary: str

# --- Endpoints ---

@app.post("/prescreen/identity", response_model=IdentityFraudScore)
async def verify_identity(request: IdentityReviewRequest):
    """
    Analyzes biometric payloads against provided SSN/Identity data.
    Simulates advanced AI fraud engine assigning a risk score.
    """
    # Mock AI Processing delay
    # In production, this would pass through a CNN liveness detector
    risk_score = 5
    factors = []
    
    if not request.biometrics.liveness_verification:
        risk_score += 80
        factors.append("Failed 3D liveness detection (possible spoof).")
        
    if request.ssn_last_four == "0000":
        risk_score += 50
        factors.append("SSN flagged in known synthetic identity database.")

    if risk_score == 5:
        factors.append("Biometrics match ID standard. Valid liveness.")

    return IdentityFraudScore(
        fraud_risk_score=min(risk_score, 100),
        factors=factors,
        is_verified=risk_score < 40
    )


@app.post("/prescreen/financial", response_model=FinancialReviewResult)
async def verify_financials(request: PlaidFinancialPayload):
    """
    Analyzes Plaid transaction ledgers to determine real cashflow
    and catch potential bounced checks or hidden debts.
    """
    bounced_checks = len([t for t in request.transactions_30d if "NSF" in t.name or "OVERDRAFT" in t.name])
    
    # Calculate presumed monthly income from positive cashflows
    income_deposits = sum(t.amount for t in request.transactions_30d if t.amount > 0 and "Payroll" in t.category)
    
    # Placeholder rent for logic (normally fetched from DB via user ID)
    target_rent = 1500.0
    
    income_ratio = income_deposits / target_rent if target_rent > 0 else 0
    
    if bounced_checks > 0:
        recommendation = "deny"
        summary = f"FAIL: {bounced_checks} overdraft/NSF fees detected in the trailing 30 days."
    elif income_ratio < 2.5:
        recommendation = "needs_review"
        summary = f"WARNING: Verified cashflow income ratio ({income_ratio:.1f}x) is below absolute threshold of 2.5x."
    else:
        recommendation = "approve"
        summary = f"PASS: Verified Plaid cashflow confirms {income_ratio:.1f}x income-to-rent ratio."

    return FinancialReviewResult(
        income_to_rent_ratio=round(income_ratio, 2),
        bounced_checks_detected=bounced_checks,
        recommendation=recommendation,
        summary=summary
    )

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Prescreening Node"}

