
import pandas as pd

from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


def get_sales_data(db: Session) -> pd.DataFrame:
    records = (
        db.query(
            Order.id.label("order_id"),
            Order.order_date,
            Order.customer_id,
            Product.name.label("product"),
            Product.category,
            OrderItem.quantity,
            OrderItem.unit_price,
            OrderItem.unit_cost
        )
        .join(OrderItem, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .all()
    )

    columns = [
        "order_id", "order_date", "customer_id",
        "product", "category", "quantity",
        "unit_price", "unit_cost"
    ]

    df = pd.DataFrame(records, columns=columns)

    if not df.empty:
        df["revenue"] = df["quantity"] * df["unit_price"]
        df["cost"] = df["quantity"] * df["unit_cost"]
        df["profit"] = df["revenue"] - df["cost"]

    return df


def get_overview(db: Session):
    df = get_sales_data(db)

    if df.empty:
        return {
            "total_revenue": 0,
            "total_orders": 0,
            "total_customers": 0,
            "gross_profit": 0,
            "profit_margin": 0,
            "average_order_value": 0
        }

    revenue = float(df["revenue"].sum())
    profit = float(df["profit"].sum())
    orders = int(df["order_id"].nunique())

    return {
        "total_revenue": round(revenue, 2),
        "total_orders": orders,
        "total_customers": int(df["customer_id"].nunique()),
        "gross_profit": round(profit, 2),
        "profit_margin": round(
            (profit / revenue * 100) if revenue else 0, 2
        ),
        "average_order_value": round(
            revenue / orders if orders else 0, 2
        )
    }


def get_monthly_sales(db: Session):
    df = get_sales_data(db)

    if df.empty:
        return []

    df["month"] = (
        pd.to_datetime(df["order_date"])
        .dt.to_period("M")
        .astype(str)
    )

    result = (
        df.groupby("month")
        .agg(
            revenue=("revenue", "sum"),
            profit=("profit", "sum"),
            orders=("order_id", "nunique")
        )
        .reset_index()
        .sort_values("month")
    )

    return result.round(2).to_dict(orient="records")


def get_top_products(db: Session, limit: int = 5):
    df = get_sales_data(db)

    if df.empty:
        return []

    result = (
        df.groupby("product")
        .agg(
            revenue=("revenue", "sum"),
            profit=("profit", "sum"),
            units_sold=("quantity", "sum")
        )
        .reset_index()
        .sort_values("revenue", ascending=False)
        .head(limit)
    )

    return result.round(2).to_dict(orient="records")


def get_category_sales(db: Session):
    df = get_sales_data(db)

    if df.empty:
        return []

    result = (
        df.groupby("category")
        .agg(
            revenue=("revenue", "sum"),
            profit=("profit", "sum"),
            units_sold=("quantity", "sum")
        )
        .reset_index()
        .sort_values("revenue", ascending=False)
    )

    return result.round(2).to_dict(orient="records")
