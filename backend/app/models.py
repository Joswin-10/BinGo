from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID

class Bin(BaseModel):
    id: UUID
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    waste_level: int = Field(..., ge=0, le=100)
    is_collected: bool = False

class Truck(BaseModel):
    id: UUID
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    status: str = Field(..., pattern="^(waiting|collecting)$")
    current_bin_id: Optional[UUID] = None
