from app import create_app
from app.models import User
from app.extensions import db
from datetime import datetime

def create_admin_user():
    app = create_app()
    with app.app_context():
        # First, check if admin already exists
        existing_admin = User.query.filter_by(email='admin@gmail.com').first()
        if existing_admin:
            print("Admin user already exists!")
            return

        # Create admin user
        admin = User(
            username='admin',
            email='admin@gmail.com',
            role='admin',
            created_at=datetime.utcnow()
        )
        admin.set_password('aaa')
        
        # Add to database
        db.session.add(admin)
        db.session.commit()
        
        print("Admin user created successfully!")

if __name__ == '__main__':
    create_admin_user() 