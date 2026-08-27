
with open('app/routers/branches.py', 'a', encoding='utf-8') as f:
    f.write('''
# Legacy endpoint to prevent frontend crash
from app.routers import branches
# Wait, this is already in branches.py, we don't need imports.
@router.get('/legacy-bunk-profile', include_in_schema=False)
def legacy_get_bunk_profile(db: Session = Depends(get_db)):
    branch = db.query(models.Branch).first()
    return {
        'id': branch.id if branch else 'B-01',
        'bunk_name': branch.name if branch else 'Default',
        'omc_brand': branch.omc_brand if branch else 'BPCL',
        'dealer_code': branch.dealer_code if branch else '00000',
        'state': 'Unknown',
        'city': branch.location if branch else 'Unknown',
        'auto_fetch_enabled': False,
        'auto_apply_enabled': False
    }
''')

