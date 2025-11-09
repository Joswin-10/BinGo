from collections import deque
import math
from typing import List, Optional
from .models import Bin, Truck
from .core.database import get_db

class DoublyLinkedList:
    class Node:
        def __init__(self, bin_data: Bin):
            self.bin = bin_data
            self.prev = None
            self.next = None

    def __init__(self):
        self.head = None
        self.tail = None

    def append(self, bin_data: Bin):
        new_node = self.Node(bin_data)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node

    def remove(self, node: Node):
        if node.prev:
            node.prev.next = node.next
        else:
            self.head = node.next

        if node.next:
            node.next.prev = node.prev
        else:
            self.tail = node.prev

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

class SimulationManager:
    def __init__(self):
        self.truck_queue = deque()
        self.db = get_db()

    def load_trucks(self):
        response = self.db.table("trucks").select("*").execute()
        self.truck_queue.clear()
        for truck_data in response.data:
            self.truck_queue.append(Truck(**truck_data))

    def get_uncollected_bins(self) -> List[Bin]:
        response = self.db.table("bins").select("*").eq("is_collected", False).execute()
        return [Bin(**bin_data) for bin_data in response.data]

    def find_closest_bin(self, truck: Truck, bins: List[Bin]) -> Optional[Bin]:
        nearby_list = DoublyLinkedList()
        
        # Find bins within 1 km
        for bin_data in bins:
            distance = haversine_distance(truck.lat, truck.lon, bin_data.lat, bin_data.lon)
            if distance <= 1:
                nearby_list.append(bin_data)
        
        if nearby_list.head:
            # Find closest bin from nearby list
            closest_bin = nearby_list.head.bin
            min_distance = haversine_distance(truck.lat, truck.lon, closest_bin.lat, closest_bin.lon)
            
            current = nearby_list.head.next
            while current:
                distance = haversine_distance(truck.lat, truck.lon, current.bin.lat, current.bin.lon)
                if distance < min_distance:
                    closest_bin = current.bin
                    min_distance = distance
                current = current.next
            
            return closest_bin
        else:
            # Find bin with highest waste level
            return max(bins, key=lambda b: b.waste_level) if bins else None

    def simulate_step(self) -> dict:
        if not self.truck_queue:
            self.load_trucks()
            if not self.truck_queue:
                return {"message": "No trucks available"}

        # Get first truck from queue
        truck = self.truck_queue.popleft()
        
        # Get uncollected bins
        bins = self.get_uncollected_bins()
        if not bins:
            return {"message": "All bins collected"}

        # Find next bin to collect
        target_bin = self.find_closest_bin(truck, bins)
        if not target_bin:
            return {"message": "No accessible bins found"}

        # Update truck position and status
        truck.lat = target_bin.lat
        truck.lon = target_bin.lon
        truck.status = "collecting"
        truck.current_bin_id = target_bin.id

        try:
            # Mark bin as collected
            self.db.table("bins").update({"is_collected": True}).eq("id", str(target_bin.id)).execute()
            
            # Convert truck data to dict and update in database
            truck_data = {
                "lat": truck.lat,
                "lon": truck.lon,
                "status": truck.status,
                "current_bin_id": str(truck.current_bin_id) if truck.current_bin_id else None
            }
            self.db.table("trucks").update(truck_data).eq("id", str(truck.id)).execute()

            # Add truck back to queue
            truck.status = "waiting"
            truck.current_bin_id = None
            self.truck_queue.append(truck)

            return {
                "message": "Simulation step completed",
                "truck_id": str(truck.id),
                "collected_bin_id": str(target_bin.id)
            }
        except Exception as e:
            print(f"Error in simulate_step: {str(e)}")
            raise
