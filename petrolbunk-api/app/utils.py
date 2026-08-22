import uuid


def generate_id(prefix: str) -> str:
    """Generate a short unique id like 'cust-3f9a2b1c4d'."""
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def generate_voucher_no(prefix: str) -> str:
    from datetime import datetime

    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{stamp}-{uuid.uuid4().hex[:4].upper()}"
