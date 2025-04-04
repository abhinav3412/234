"""create user_requests table

Revision ID: create_user_requests_table
Revises: 
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'create_user_requests_table'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create user_requests table
    op.create_table('user_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('number_slots', sa.Integer(), nullable=False),
        sa.Column('camp_id', sa.Integer(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['camp_id'], ['camps.cid'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    # Drop user_requests table
    op.drop_table('user_requests') 