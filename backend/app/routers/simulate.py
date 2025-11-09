from fastapi import APIRouter, HTTPException
from ..simulate import SimulationManager

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

@router.post("/run")
def simulate_run():
    try:
        result = simulation_manager.simulate_all()
        return result
    except Exception as e:
        print(f"Error in simulate_run endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))