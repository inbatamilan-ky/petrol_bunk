import xlrd, json

# Read Daily Expenses
print('\n=== DAILY EXPENSES 2024.xls ===')
wb = xlrd.open_workbook('data/Daily Expenses 2024.xls')
for sh in wb.sheets():
    print(f'\n  Sheet: "{sh.name}", Rows: {sh.nrows}, Cols: {sh.ncols}')
    if sh.nrows > 0:
        headers = [str(sh.cell_value(0, c)) for c in range(sh.ncols)]
        print(f'  Headers: {headers}')
    for r in range(1, min(6, sh.nrows)):
        row_data = [str(sh.cell_value(r, c)) for c in range(sh.ncols)]
        print(f'  Row{r}: {row_data}')

print('\n=== CREDIT CUSTOMER-2024.xls ===')
wb2 = xlrd.open_workbook('data/Credit Customer-2024.xls')
for sh in wb2.sheets():
    print(f'\n  Sheet: "{sh.name}", Rows: {sh.nrows}, Cols: {sh.ncols}')
    if sh.nrows > 0:
        headers = [str(sh.cell_value(0, c)) for c in range(sh.ncols)]
        print(f'  Headers: {headers}')
    for r in range(1, min(6, sh.nrows)):
        row_data = [str(sh.cell_value(r, c)) for c in range(sh.ncols)]
        print(f'  Row{r}: {row_data}')

print('\n=== DAILY ACCOUNTS - first 2 sheets ===')
wb3 = xlrd.open_workbook('data/Daily Accounts April 2024.xls')
for sh in wb3.sheets()[:2]:
    print(f'\n  Sheet: "{sh.name}", Rows: {sh.nrows}, Cols: {sh.ncols}')
    for r in range(min(10, sh.nrows)):
        row_data = [str(sh.cell_value(r, c)) for c in range(min(sh.ncols, 20))]
        print(f'  Row{r}: {row_data}')
