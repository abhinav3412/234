import sqlite3
import os

# Get the database path from the environment variable or use a default
db_path = os.environ.get('DATABASE_URL', 'app.db')
if db_path.startswith('sqlite:///'):
    db_path = db_path[10:]  # Remove the 'sqlite:///' prefix

print(f"Connecting to database at: {db_path}")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add the missing columns to the camps table
try:
    # Check if columns exist before adding them
    cursor.execute("PRAGMA table_info(camps)")
    columns = [column[1] for column in cursor.fetchall()]
    
    # Add food_stock_quota column if it doesn't exist
    if 'food_stock_quota' not in columns:
        print("Adding food_stock_quota column...")
        cursor.execute("ALTER TABLE camps ADD COLUMN food_stock_quota INTEGER DEFAULT 0")
    
    # Add water_stock_litres column if it doesn't exist
    if 'water_stock_litres' not in columns:
        print("Adding water_stock_litres column...")
        cursor.execute("ALTER TABLE camps ADD COLUMN water_stock_litres INTEGER DEFAULT 0")
    
    # Add essentials_stock column if it doesn't exist
    if 'essentials_stock' not in columns:
        print("Adding essentials_stock column...")
        cursor.execute("ALTER TABLE camps ADD COLUMN essentials_stock INTEGER DEFAULT 0")
    
    # Add clothes_stock column if it doesn't exist
    if 'clothes_stock' not in columns:
        print("Adding clothes_stock column...")
        cursor.execute("ALTER TABLE camps ADD COLUMN clothes_stock INTEGER DEFAULT 0")
    
    # Commit the changes
    conn.commit()
    print("Successfully added missing columns to the camps table.")
    
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close() 