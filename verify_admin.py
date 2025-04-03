from app import create_app
from app.models import User
from app.extensions import db

def verify_admin():
    app = create_app()
    with app.app_context():
        # Check if admin user exists
        admin = User.query.filter_by(email='admin@gmail.com').first()
        if admin:
            print("Admin user found:")
            print(f"Username: {admin.username}")
            print(f"Email: {admin.email}")
            print(f"Role: {admin.role}")
            print(f"Password hash: {admin.password}")
        else:
            print("Admin user not found!")

if __name__ == '__main__':
    verify_admin() 