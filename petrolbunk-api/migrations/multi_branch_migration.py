from app.database import engine
from sqlalchemy import text
from app.models import Base

def migrate():
    # 1. Create new tables (branches, user_branches)
    Base.metadata.create_all(bind=engine)
    print("Created new tables.")

    tables_to_migrate = [
        "tanks", "pumps", "nozzles", "operators", "shifts", 
        "meter_readings", "credit_transactions", "credit_payments", 
        "expenses", "bank_deposits", "tank_dips", "daily_nozzle_meters", 
        "sms_rate_logs", "bank_accounts", "pos_settlements", 
        "cash_safe_ledger", "fuel_rate_history"
    ]

    with engine.begin() as conn:
        # Create a default branch
        conn.execute(text("INSERT INTO branches (id, name, omc_brand, is_active) VALUES ('B-01', 'Default Branch', 'BPCL', true) ON CONFLICT (id) DO NOTHING;"))
        
        # Also assign all existing users to this branch
        conn.execute(text("INSERT INTO user_branches (user_id, branch_id, role) SELECT id, 'B-01', role FROM users ON CONFLICT (user_id, branch_id) DO NOTHING;"))

        for table in tables_to_migrate:
            try:
                # Add column (might fail if it already exists, which is fine, we catch it)
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN branch_id VARCHAR(20) REFERENCES branches(id) ON DELETE CASCADE;"))
            except Exception as e:
                print(f"Column branch_id might already exist in {table}: {e}")
            
            # Update existing rows
            conn.execute(text(f"UPDATE {table} SET branch_id = 'B-01' WHERE branch_id IS NULL;"))
            
            # Make it NOT NULL
            try:
                conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN branch_id SET NOT NULL;"))
            except Exception as e:
                print(f"Could not set NOT NULL on {table}: {e}")

        # Drop bunk_profile table if it exists
        try:
            conn.execute(text("DROP TABLE bunk_profile;"))
        except Exception:
            pass
            
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
