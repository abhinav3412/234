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

# List all tables in the database
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables in the database:")
for table in tables:
    print(f"- {table[0]}")
    
    # Get column information for each table
    cursor.execute(f"PRAGMA table_info({table[0]})")
    columns = cursor.fetchall()
    print("  Columns:")
    for column in columns:
        print(f"  - {column[1]} ({column[2]})")

conn.close() 