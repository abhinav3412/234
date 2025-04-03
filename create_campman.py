from app import create_app
from app.models import User
from app.extensions import db
from datetime import datetime

def create_camp_manager():
    app = create_app()
    with app.app_context():
        # Create camp manager user
        camp_manager = User(
            username='camp_manager',
            email='camp_manager@gmail.com',
            role='camp_manager',
            created_at=datetime.utcnow()
        )
        camp_manager.set_password('aaa')
        
        # Add to database
        db.session.add(camp_manager)
        db.session.commit()
        
        print("Camp manager user created successfully!")

if __name__ == '__main__':
    create_camp_manager() 