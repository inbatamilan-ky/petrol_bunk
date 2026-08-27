"""Add multi-branch support

Revision ID: b99b6ef4c6d8
Revises: 
Create Date: 2026-08-26 11:55:24.440557

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'b99b6ef4c6d8'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def table_exists(table_name):
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # 1. Create tables
    if not table_exists('branches'):
        op.create_table('branches',
            sa.Column('id', sa.String(length=20), nullable=False),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('location', sa.String(length=255), nullable=True),
            sa.Column('dealer_code', sa.String(length=50), nullable=True),
            sa.Column('omc_brand', sa.String(length=30), nullable=False, server_default='BPCL'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        
    if not table_exists('user_branches'):
        op.create_table('user_branches',
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('branch_id', sa.String(length=20), nullable=False),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('user_id', 'branch_id')
        )

    # 2. Insert Default Branch and Migrate Users
    op.execute("INSERT INTO branches (id, name, omc_brand, is_active) VALUES ('B-01', 'Default Branch', 'BPCL', true) ON CONFLICT (id) DO NOTHING;")
    op.execute("INSERT INTO user_branches (user_id, branch_id, is_default) SELECT id, 'B-01', true FROM users ON CONFLICT DO NOTHING;")

    # 3. Add branch_id to operational models
    tables = [
        'tanks', 'pumps', 'nozzles', 'operators', 'shifts', 'meter_readings', 
        'credit_transactions', 'credit_payments', 'expenses', 'bank_deposits', 
        'tank_dips', 'daily_nozzle_meters', 'sms_rate_logs', 'bank_accounts', 
        'pos_settlements', 'cash_safe_ledger', 'fuel_rate_history'
    ]

    for table in tables:
        # Check if column exists
        conn = op.get_bind()
        inspector = Inspector.from_engine(conn)
        columns = [c['name'] for c in inspector.get_columns(table)]
        if 'branch_id' not in columns:
            op.add_column(table, sa.Column('branch_id', sa.String(length=20), nullable=True))
            # 4. Assign existing records to default branch
            op.execute(f"UPDATE {table} SET branch_id = 'B-01' WHERE branch_id IS NULL;")
            # 5. Make NOT NULL and add Foreign Key
            op.alter_column(table, 'branch_id', nullable=False)
            op.create_foreign_key(f"fk_{table}_branch_id", table, 'branches', ['branch_id'], ['id'], ondelete='CASCADE')
            op.create_index(f"ix_{table}_branch_id", table, ['branch_id'])

    # 6. Drop BunkProfile if exists
    if table_exists('bunk_profile'):
        op.drop_table('bunk_profile')


def downgrade() -> None:
    pass
