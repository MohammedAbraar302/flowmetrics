
import pandas as pd
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem


def get_rfm_analysis(db: Session):
    records = (
        db.query(
            Customer.id.label("customer_id"),
            Customer.name.label("customer_name"),
            Customer.city,
            Order.id.label("order_id"),
            Order.order_date,
            OrderItem.quantity,
            OrderItem.unit_price
        )
        .join(Order, Customer.id == Order.customer_id)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .all()
    )

    columns = [
        "customer_id", "customer_name", "city",
        "order_id", "order_date", "quantity", "unit_price"
    ]

    df = pd.DataFrame(records, columns=columns)

    if df.empty:
        return []

    df["order_date"] = pd.to_datetime(df["order_date"])
    df["revenue"] = df["quantity"] * df["unit_price"]

    # Aggregate transactions at customer level
    rfm = (
        df.groupby(
            ["customer_id", "customer_name", "city"]
        )
        .agg(
            last_purchase=("order_date", "max"),
            frequency=("order_id", "nunique"),
            monetary=("revenue", "sum")
        )
        .reset_index()
    )

    # Use the current date as the analysis reference
    analysis_date = pd.Timestamp.now().normalize()

    rfm["recency"] = (
        analysis_date - rfm["last_purchase"].dt.normalize()
    ).dt.days.clip(lower=0)

    # Assign scores from 1 to 5
    def score(series, ascending=True):
        return (
            series.rank(method="average", pct=True, ascending=ascending)
            .mul(5)
            .apply(lambda x: min(5, max(1, int(__import__("math").ceil(x))))
            )
            .astype(int)
        )

    # Lower recency is better, higher frequency and monetary are better
    rfm["R_score"] = score(rfm["recency"], ascending=False)
    rfm["F_score"] = score(rfm["frequency"])
    rfm["M_score"] = score(rfm["monetary"])

    def classify(row):
        r, f, m = row["R_score"], row["F_score"], row["M_score"]

        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        if f >= 4 and m >= 3:
            return "Loyal Customers"
        if r >= 4 and f >= 2:
            return "Potential Loyalists"
        if r >= 4:
            return "Recent Customers"
        if r <= 2 and f >= 3:
            return "At Risk"
        if r <= 2:
            return "Hibernating"
        return "Needs Attention"

    rfm["segment"] = rfm.apply(classify, axis=1)
    rfm["RFM_score"] = (
        rfm["R_score"].astype(str)
        + rfm["F_score"].astype(str)
        + rfm["M_score"].astype(str)
    )

    rfm["last_purchase"] = (
        rfm["last_purchase"].dt.strftime("%Y-%m-%d")
    )

    return rfm.sort_values(
        ["R_score", "F_score", "M_score"],
        ascending=False
    ).round({"monetary": 2}).to_dict(orient="records")


def get_segment_summary(db: Session):
    customers = pd.DataFrame(get_rfm_analysis(db))

    if customers.empty:
        return []

    summary = (
        customers.groupby("segment")
        .agg(
            customer_count=("customer_id", "count"),
            total_revenue=("monetary", "sum"),
            average_frequency=("frequency", "mean")
        )
        .reset_index()
    )

    return summary.round(2).to_dict(orient="records")
