import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = None

def init_db():
    global supabase
    if not url or not key:
        raise ValueError("Missing Supabase credentials. Please check your .env file.")
    supabase = create_client(url, key)

def get_db() -> Client:
    if not supabase:
        init_db()
    return supabase