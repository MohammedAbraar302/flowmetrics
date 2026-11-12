
import pandas as pd
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order


def get_retention_overview(db: Session):
    records = (
        db.query(Order.customer_id, Order.id)
        .all()
    )

    if not records:
        return {
            "total_customers": db.query(Customer).count(),
            "purchasing_customers": 0,
            "repeat_customers": 0,
            "one_time_customers": 0,
            "repeat_rate": 0,
            "average_orders_per_customer": 0
        }

    df = pd.DataFrame(
        records,
        columns=["customer_id", "order_id"]
    )

    orders = df.groupby("customer_id")["order_id"].nunique()

    purchasing = len(orders)
    repeat = int((orders >= 2).sum())
    one_time = int((orders == 1).sum())

    return {
        "total_customers": db.query(Customer).count(),
        "purchasing_customers": purchasing,
        "repeat_customers": repeat,
        "one_time_customers": one_time,
        "repeat_rate": round(repeat / purchasing * 100, 2),
        "average_orders_per_customer": round(orders.mean(), 2)
    }


def get_cohort_retention(db: Session):
    records = (
        db.query(
            Order.customer_id,
            Order.order_date
        )
        .all()
    )

    if not records:
        return []

    df = pd.DataFrame(
        records,
        columns=["customer_id", "order_date"]
    )

    df["order_date"] = pd.to_datetime(df["order_date"])
    df["order_month"] = df["order_date"].dt.to_period("M")

    # Find each customer's first purchase month
    df["cohort_month"] = (
        df.groupby("customer_id")["order_month"]
        .transform("min")
    )

    # Calculate months since the first purchase
    df["period_number"] = (
        (df["order_month"].dt.year - df["cohort_month"].dt.year) * 12
        + df["order_month"].dt.month
        - df["cohort_month"].dt.month
    )

    # Count distinct active customers in each cohort period
    retention = (
        df.groupby(
            ["cohort_month", "period_number"]
        )["customer_id"]
        .nunique()
        .reset_index(name="active_customers")
    )

    cohort_sizes = (
        df.groupby("cohort_month")["customer_id"]
        .nunique()
        .to_dict()
    )

    retention["cohort_size"] = retention["cohort_month"].map(
        cohort_sizes
    )

    retention["retention_rate"] = (
        retention["active_customers"]
        / retention["cohort_size"] * 100
    ).round(2)

    retention["cohort_month"] = (
        retention["cohort_month"].astype(str)
    )

    return retention.sort_values(
        ["cohort_month", "period_number"]
    ).to_dict(orient="records")
