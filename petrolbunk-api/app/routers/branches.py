from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin, get_current_branch

router = APIRouter(prefix="/api/branches", tags=["Branches"])

@router.get("", response_model=List[schemas.BranchOut])
def get_user_branches(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Returns branches the current user has access to."""
    if current_user.role == 1: # Owner sees all branches
        return db.query(models.Branch).all()
    
    # Manager/Operator sees assigned branches
    user_branches = db.query(models.UserBranch).filter(models.UserBranch.user_id == current_user.id).all()
    branch_ids = [ub.branch_id for ub in user_branches]
    return db.query(models.Branch).filter(models.Branch.id.in_(branch_ids)).all()

@router.get("/{id}", response_model=schemas.BranchOut)
def get_branch(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    branch = db.query(models.Branch).filter(models.Branch.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@router.post("", response_model=schemas.BranchOut)
def create_branch(payload: schemas.BranchCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    import uuid
    new_id = f"b-{uuid.uuid4().hex[:8]}"
    branch = models.Branch(id=new_id, **payload.model_dump())
    db.add(branch)
    
    # Assign the creator (Owner) to the new branch
    ub = models.UserBranch(user_id=current_user.id, branch_id=new_id, is_default=True)
    db.add(ub)
    
    db.commit()
    db.refresh(branch)
    return branch

@router.put("/{id}", response_model=schemas.BranchOut)
def update_branch(id: str, payload: schemas.BranchUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    branch = db.query(models.Branch).filter(models.Branch.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(branch, key, value)
    db.commit()
    db.refresh(branch)
    return branch

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
