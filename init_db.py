import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Camp, Warehouse, Vehicle, CampNotification, UserRequest
from datetime import datetime

def init_db():
    app = create_app()
    with app.app_context():
        # Drop all tables
        db.drop_all()
        
        # Create all tables
        db.create_all()
        
        print("Database initialized successfully!")
        
        # Create admin user if it doesn't exist
        admin = User.query.filter_by(email='admin@gmail.com').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@gmail.com',
                role='admin',
                created_at=datetime.utcnow()
            )
            admin.set_password('aaa')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists.")

if __name__ == '__main__':
    init_db() 