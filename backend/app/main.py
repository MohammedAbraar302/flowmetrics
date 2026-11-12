
from fastapi import FastAPI

from app.database import Base, engine
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem
from app.routes.analytics import router as analytics_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FlowMetrics API",
    description="Business Intelligence & Customer Analytics",
    version="1.0.0"
)

app.include_router(analytics_router)


@app.get("/")
def root():
    return {
        "project": "FlowMetrics",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/database-status")
def database_status():
    return {
        "database": "SQLite",
        "status": "connected",
        "tables": [
            "customers",
            "products",
            "orders",
            "order_items"
        ]
    }
