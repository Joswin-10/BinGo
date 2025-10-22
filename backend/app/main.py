from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import bins, trucks, simulate
from .core.database import init_db

app = FastAPI(title="BinGo API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternative port)
        "http://localhost:5175",  # Vite dev server (alternative port)
        "http://localhost:5176",  # Vite dev server (alternative port)
        "http://localhost:5177",  # Vite dev server (alternative port)
        "http://localhost:5178",  # Vite dev server (alternative port)
        "https://bin-go-xi.vercel.app",  # Vercel deployment
        "https://bin-go-xi.vercel.app/",  # Vercel deployment with trailing slash
        "http://bin-go-xi.vercel.app",  # HTTP version
        "http://bin-go-xi.vercel.app/",  # HTTP version with trailing slash
        "https://bingo-production-091b.up.railway.app",  # Railway backend URL (for development)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Initialize database connection
@app.on_event("startup")
async def startup_event():
    init_db()

# Include routers
app.include_router(bins.router, prefix="/api/bins", tags=["bins"])
app.include_router(trucks.router, prefix="/api/trucks", tags=["trucks"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["simulate"])
