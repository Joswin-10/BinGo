from fastapi import APIRouter, HTTPException
from ..models import Bin
from ..core.database import get_db
from typing import List
import asyncio

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

@router.post("/reset")
async def reset_all_bins():
    """Reset all bins to uncollected status"""
    try:
        db = get_db()
        
        # First, get all bins from the table to get their IDs
        all_bins_response = db.table("bins").select("id, is_collected").execute()
        all_bins = all_bins_response.data
        
        if not all_bins:
            return {
                "message": "No bins found to reset",
                "bins_reset": 0,
                "uncollected_count": 0,
                "total_bins": 0
            }
        
        total_bins = len(all_bins)
        initial_collected = len([b for b in all_bins if b.get("is_collected", False)])
        
        # Update each bin individually to set is_collected to False
        # This is necessary because Supabase requires a filter for updates
        errors = []
        
        for bin_data in all_bins:
            try:
                bin_id = bin_data["id"]
                # Update each bin to set is_collected to False
                update_data = {"is_collected": False}
                
                # Execute the update - even if it returns no data, the update should work
                db.table("bins").update(update_data).eq("id", str(bin_id)).execute()
                    
            except Exception as e:
                error_msg = f"Bin {bin_id}: {str(e)}"
                errors.append(error_msg)
                print(f"Error updating bin {bin_id}: {str(e)}")
                # Continue with other bins even if one fails
                continue
        
        # Wait a moment for updates to propagate, then verify the update
        await asyncio.sleep(0.1)  # Small delay to ensure updates are committed
        
        # Verify the update by checking all bins
        verify_response = db.table("bins").select("id, is_collected").execute()
        uncollected_count = len([b for b in verify_response.data if not b.get("is_collected", False)])
        collected_count = len([b for b in verify_response.data if b.get("is_collected", False)])
        
        result = {
            "message": "All bins have been reset" if collected_count == 0 else f"Reset completed: {uncollected_count} uncollected, {collected_count} still collected",
            "bins_reset": total_bins,
            "uncollected_count": uncollected_count,
            "collected_count": collected_count,
            "total_bins": total_bins,
            "initial_collected": initial_collected
        }
        
        if errors:
            result["errors"] = errors[:5]  # Include first 5 errors if any
            result["error_count"] = len(errors)
        
        return result
        
    except Exception as e:
        print(f"Error in reset_all_bins: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))