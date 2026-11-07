from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from config import settings

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)

def verify_admin_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != settings.ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Admin Key. Access denied.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return api_key

