
import random
from datetime import datetime, timedelta

from faker import Faker

from app.database import Base, engine, SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem

fake = Faker("en_IN")
random.seed(42)
Faker.seed(42)

Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()

    try:
        if db.query(Order).first():
            print("Dataset already exists.")
            return

        # Customers
        customers = []

        for _ in range(50):
            customer = Customer(
                name=fake.name(),
                email=fake.unique.email(),
                city=random.choice([
                    "Hyderabad", "Mumbai", "Delhi",
                    "Bengaluru", "Chennai", "Pune"
                ])
            )
            customers.append(customer)
            db.add(customer)

        db.flush()

        # Products
        products = []

        catalog = [
            ("Laptop", "Electronics", 42000, 55000),
            ("Smartphone", "Electronics", 12000, 18000),
            ("Headphones", "Accessories", 800, 1500),
            ("Office Chair", "Furniture", 3500, 5200),
            ("Desk", "Furniture", 4500, 6500),
            ("Keyboard", "Accessories", 500, 1000),
            ("Monitor", "Electronics", 7000, 10500),
            ("Backpack", "Lifestyle", 900, 1600),
            ("Water Bottle", "Lifestyle", 200, 450),
            ("Mouse", "Accessories", 350, 700)
        ]

        for name, category, cost, price in catalog:
            product = Product(
                name=name,
                category=category,
                cost_price=cost,
                selling_price=price
            )
            products.append(product)
            db.add(product)

        db.flush()

        # Orders and order items
        for _ in range(300):
            order_date = (
                datetime.now()
                - timedelta(days=random.randint(0, 365))
            )

            order = Order(
                customer_id=random.choice(customers).id,
                order_date=order_date,
                total_amount=0
            )

            db.add(order)
            db.flush()

            total = 0

            for product in random.sample(
                products,
                k=random.randint(1, 4)
            ):
                quantity = random.randint(1, 3)

                item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.selling_price,
                    unit_cost=product.cost_price
                )

                total += quantity * product.selling_price
                db.add(item)

            order.total_amount = total

        db.commit()

        print("Synthetic dataset created successfully.")
        print(f"Customers: {db.query(Customer).count()}")
        print(f"Products: {db.query(Product).count()}")
        print(f"Orders: {db.query(Order).count()}")
        print(f"Order items: {db.query(OrderItem).count()}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
