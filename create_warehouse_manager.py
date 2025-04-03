from app import create_app
from app.models import User, Warehouse, db
from datetime import datetime

def create_warehouse_manager():
    app = create_app()
    with app.app_context():
        # Create warehouse manager user
        warehouse_manager = User.query.filter_by(email='warehouse_manager@gmail.com').first()
        if not warehouse_manager:
            warehouse_manager = User(
                username='warehouse_manager',
                email='warehouse_manager@gmail.com',
                role='warehouse_manager',
                created_at=datetime.utcnow()
            )
            warehouse_manager.set_password('warehouse123')
            db.session.add(warehouse_manager)
            db.session.commit()
            print("Warehouse manager user created successfully!")

        # Create warehouse for the manager
        warehouse = Warehouse.query.filter_by(manager_id=warehouse_manager.uid).first()
        if not warehouse:
            warehouse = Warehouse(
                name='Main Warehouse',
                location='Industrial Area',
                latitude=12.9716,
                longitude=77.5946,
                status='Operational',
                food_capacity=2000,
                water_capacity=10000,
                essential_capacity=500,
                clothes_capacity=1000,
                manager_id=warehouse_manager.uid
            )
            db.session.add(warehouse)
            db.session.commit()
            print("Warehouse created and assigned to warehouse manager!")

if __name__ == '__main__':
    create_warehouse_manager() 