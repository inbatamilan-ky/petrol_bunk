import pandas as pd
import sys
import os

def main():
    print("=========================================")
    print("   petrol bunk Excel Import Wizard")
    print("=========================================\n")
    
    excel_path = input("Enter the path to your Excel file: ").strip()
    
    if not os.path.exists(excel_path):
        print(f"Error: File '{excel_path}' not found.")
        return

    try:
        df = pd.read_excel(excel_path)
        print("\nColumns found in Excel:", list(df.columns))
    except Exception as e:
        print(f"Failed to read Excel: {e}")
        return

    print("\nWhich entity are you importing?")
    print("1. Pump")
    print("2. Product")
    print("3. Operator")
    print("4. Credit Customer")
    choice = input("Enter choice (1-4): ").strip()
    
    entity_map = {'1': 'Pump', '2': 'Product', '3': 'Operator', '4': 'CreditCustomer'}
    entity = entity_map.get(choice)
    
    if not entity:
        print("Invalid choice.")
        return
        
    print(f"\n--- Mapping Fields for {entity} ---")
    print("For each system field, type the EXACT column name from your Excel file, or press Enter to skip if not applicable.\n")
    
    mapping = {}
    
    if entity == 'Pump':
        mapping['pumpNo'] = input("Excel column for 'Pump Number': ").strip()
        mapping['name'] = input("Excel column for 'Pump Name/Location': ").strip()
        
    elif entity == 'Product':
        mapping['code'] = input("Excel column for 'Product Code' (e.g. HSD): ").strip()
        mapping['name'] = input("Excel column for 'Product Name': ").strip()
        mapping['current_rate'] = input("Excel column for 'Current Rate': ").strip()
        
    elif entity == 'Operator':
        mapping['name'] = input("Excel column for 'Operator Name': ").strip()
        mapping['phone'] = input("Excel column for 'Phone Number': ").strip()
        
    elif entity == 'CreditCustomer':
        mapping['code'] = input("Excel column for 'Customer Code': ").strip()
        mapping['name'] = input("Excel column for 'Customer Name': ").strip()
        mapping['credit_limit'] = input("Excel column for 'Credit Limit': ").strip()

    print("\nProcessing...")
    success_count = 0
    for index, row in df.iterrows():
        # In a real app, this would send mapped data to backend or DB
        data = {k: row[v] for k, v in mapping.items() if v in df.columns}
        if data:
            success_count += 1
            print(f"Imported {entity}: {data}")
            
    print(f"\nSuccessfully processed {success_count} records!")
    print("Next step: integrate this script with the DB/API as needed.")

if __name__ == '__main__':
    main()
