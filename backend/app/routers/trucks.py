from fastapi import APIRouter, HTTPException
from ..models import Truck
from ..core.database import get_db
from typing import List

router = APIRouter()

@router.get("/", response_model=List[Truck])
async def get_trucks():
    try:
        response = get_db().table("trucks").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Truck)
async def create_truck(truck: Truck):
    try:
        response = get_db().table("trucks").insert(truck.model_dump()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{truck_id}", response_model=Truck)
async def update_truck(truck_id: str, truck: Truck):
    try:
        response = get_db().table("trucks").update(truck.model_dump()).eq("id", truck_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Truck not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))