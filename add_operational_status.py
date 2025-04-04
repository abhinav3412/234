import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'app.db')

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if the column already exists
    cursor.execute("PRAGMA table_info(sensor)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'operational_status' not in columns:
        # Add the operational_status column with a default value of 'Active'
        cursor.execute("ALTER TABLE sensor ADD COLUMN operational_status VARCHAR(20) DEFAULT 'Active'")
        print("Added operational_status column to sensor table")
    else:
        print("operational_status column already exists in sensor table")
    
    # Commit the changes
    conn.commit()
    print("Database updated successfully")
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    # Close the connection
    conn.close() 