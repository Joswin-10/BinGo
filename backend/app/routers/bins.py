from fastapi import APIRouter, HTTPException
from ..models import Bin
from ..core.database import get_db
from typing import List

router = APIRouter()

@router.get("/", response_model=List[Bin])
async def get_bins():
    try:
        response = get_db().table("bins").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Bin)
async def create_bin(bin: Bin):
    try:
        response = get_db().table("bins").insert(bin.model_dump()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uncollected", response_model=List[Bin])
async def get_uncollected_bins():
    try:
        response = get_db().table("bins").select("*").eq("is_collected", False).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{bin_id}/collect")
async def mark_bin_collected(bin_id: str):
    try:
        response = get_db().table("bins").update({"is_collected": True}).eq("id", bin_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bin not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))