
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session


from app.database import get_db
from app.services.analytics import (
    get_overview,
    get_monthly_sales,
    get_top_products,
    get_category_sales
)

from app.services.rfm import (
    get_rfm_analysis,
    get_segment_summary
)

from app.services.retention import (
    get_retention_overview,
    get_cohort_retention
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    return get_overview(db)


@router.get("/monthly-sales")
def monthly_sales(db: Session = Depends(get_db)):
    return get_monthly_sales(db)


@router.get("/top-products")
def top_products(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db)
):
    return get_top_products(db, limit)


@router.get("/categories")
def category_sales(db: Session = Depends(get_db)):
    return get_category_sales(db)



@router.get("/rfm")
def rfm_analysis(db: Session = Depends(get_db)):
    return get_rfm_analysis(db)


@router.get("/segments")
def segment_summary(db: Session = Depends(get_db)):
    return get_segment_summary(db)


@router.get("/retention/overview")
def retention_overview(db: Session = Depends(get_db)):
    return get_retention_overview(db)


@router.get("/retention/cohorts")
def cohort_retention(db: Session = Depends(get_db)):
    return get_cohort_retention(db)
