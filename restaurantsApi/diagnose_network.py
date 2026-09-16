import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from django.db import connection
from django.db.utils import OperationalError

def main():
    print("--- Diagnostic Report ---")
    
    # 1. Check DB Connection
    print("\n1. Checking Database Connection...")
    try:
        connection.ensure_connection()
        print("SUCCESS: Database connection established.")
    except OperationalError as e:
        print(f"FAILURE: Could not connect to database: {e}")
        return

    # 2. Check Migrations Status
    print("\n2. Checking Migrations Status...")
    from django.db.migrations.executor import MigrationExecutor
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    if plan:
        print(f"WARNING: There are {len(plan)} unapplied migrations!")
        for migration, backwards in plan:
            print(f" - {migration}")
    else:
        print("SUCCESS: All migrations are applied.")

    # 3. Check specific models
    print("\n3. Checking Models Access...")
    try:
        from payments.models import Shift, TreasuryTransaction, SalaryPayment
        from orders.models import Order
        
        s_count = Shift.objects.count()
        t_count = TreasuryTransaction.objects.count()
        o_count = Order.objects.count()
        
        print(f"Shifts: {s_count}")
        print(f"Transactions: {t_count}")
        print(f"Orders: {o_count}")
        
    except Exception as e:
        print(f"FAILURE: Error accessing models: {e}")

if __name__ == "__main__":
    main()
