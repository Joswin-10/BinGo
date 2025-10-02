from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import random
from .models import Bin, Truck, TruckStatus, SimulationState
from .simulate import simulate_step

app = FastAPI(title="BinGo Waste Management API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://bin-go-ca4i.vercel.app",
        "https://*.vercel.app"  # Allow all Vercel subdomains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize simulation state
def create_initial_data():
    # Create bins around NYC area
    bins = []
    base_lat, base_lon = 40.7128, -74.0060
    
    for i in range(20):
        bin = Bin(
            id=i + 1,
            lat=base_lat + random.uniform(-0.05, 0.05),
            lon=base_lon + random.uniform(-0.05, 0.05),
            waste_level=random.uniform(0, 100),
            is_collected=False
        )
        bins.append(bin)
    
    # Create trucks
    trucks = []
    for i in range(3):
        truck = Truck(
            id=i + 1,
            lat=base_lat + random.uniform(-0.02, 0.02),
            lon=base_lon + random.uniform(-0.02, 0.02),
            status=TruckStatus.IDLE,
            capacity=100.0,
            current_load=0.0
        )
        trucks.append(truck)
    
    return SimulationState(bins=bins, trucks=trucks, step=0)

# Global simulation state
simulation_state = create_initial_data()

@app.get("/")
async def root():
    return {"message": "BinGo Waste Management API"}

@app.get("/api/bins", response_model=List[Bin])
async def get_bins():
    """Get all bins"""
    return simulation_state.bins

@app.get("/api/trucks", response_model=List[Truck])
async def get_trucks():
    """Get all trucks"""
    return simulation_state.trucks

@app.post("/api/simulate/step")
async def simulate_step_endpoint():
    """Run one simulation step"""
    result = simulate_step(simulation_state.bins, simulation_state.trucks)
    simulation_state.step += 1
    
    return {
        "step": simulation_state.step,
        "result": result,
        "message": f"Simulation step {simulation_state.step} completed"
    }

@app.get("/api/simulation/state")
async def get_simulation_state():
    """Get current simulation state"""
    return {
        "step": simulation_state.step,
        "bins_count": len(simulation_state.bins),
        "trucks_count": len(simulation_state.trucks),
        "total_waste": sum(bin.waste_level for bin in simulation_state.bins),
        "collected_bins": sum(1 for bin in simulation_state.bins if bin.is_collected)
    }

@app.post("/api/simulation/reset")
async def reset_simulation():
    """Reset simulation to initial state"""
    global simulation_state
    simulation_state = create_initial_data()
    return {"message": "Simulation reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)