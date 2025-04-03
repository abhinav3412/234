from app import create_app
from app.models import User, db

app = create_app()

with app.app_context():
    # Check if admin already exists
    admin = User.query.filter_by(email='admin@gmail.com').first()
    
    if not admin:
        # Create new admin user
        admin = User(
            username='admin',
            email='admin@gmail.com',
            role='admin',
            is_active=True
        )
        admin.set_password('aaa')
        
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")
    else:
        print("Admin user already exists!") 