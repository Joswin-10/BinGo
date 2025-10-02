from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class TruckStatus(str, Enum):
    IDLE = "idle"
    COLLECTING = "collecting"
    RETURNING = "returning"

class Bin(BaseModel):
    id: int
    lat: float
    lon: float
    waste_level: float  # 0-100 percentage
    is_collected: bool = False

class Truck(BaseModel):
    id: int
    lat: float
    lon: float
    status: TruckStatus = TruckStatus.IDLE
    capacity: float = 100.0
    current_load: float = 0.0

class SimulationState(BaseModel):
    bins: List[Bin]
    trucks: List[Truck]
    step: int = 0