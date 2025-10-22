from fastapi import APIRouter, HTTPException
from ..simulate import SimulationManager
from ..core.database import get_db

router = APIRouter()
simulation_manager = SimulationManager()

@router.post("/step")
def simulate_step():
    try:
        result = simulation_manager.simulate_step()
        return result
    except Exception as e:
        print(f"Error in simulate_step endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
def reset_simulation():
    try:
        # Reset all bins to uncollected
        db = get_db()
        result = db.table("bins").update({"is_collected": False}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # Reset all trucks to waiting status
        truck_result = db.table("trucks").update({
            "status": "waiting",
            "current_bin_id": None
        }).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        return {
            "message": "Simulation reset successfully",
            "bins_reset": result.count if hasattr(result, 'count') else 0,
            "trucks_reset": truck_result.count if hasattr(truck_result, 'count') else 0
        }
    except Exception as e:
        print(f"Error in reset_simulation endpoint: {str(e)}")
        return {
            "message": "Reset completed with some errors",
            "bins_reset": 0,
            "trucks_reset": 0,
            "error": str(e)
        }