import random
import math
from typing import List
from .models import Bin, Truck, TruckStatus

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def find_nearest_bin(truck: Truck, bins: List[Bin]) -> Bin:
    """Find the nearest uncollected bin with high waste level"""
    uncollected_bins = [bin for bin in bins if not bin.is_collected and bin.waste_level > 50]
    
    if not uncollected_bins:
        return None
    
    nearest_bin = min(uncollected_bins, 
                     key=lambda bin: calculate_distance(truck.lat, truck.lon, bin.lat, bin.lon))
    return nearest_bin

def move_towards(current_lat: float, current_lon: float, target_lat: float, target_lon: float, speed: float = 0.001) -> tuple:
    """Move towards target position by a small step"""
    lat_diff = target_lat - current_lat
    lon_diff = target_lon - current_lon
    
    distance = math.sqrt(lat_diff**2 + lon_diff**2)
    
    if distance <= speed:
        return target_lat, target_lon
    
    # Normalize and apply speed
    lat_step = (lat_diff / distance) * speed
    lon_step = (lon_diff / distance) * speed
    
    return current_lat + lat_step, current_lon + lon_step

def simulate_step(bins: List[Bin], trucks: List[Truck]) -> dict:
    """Simulate one step of the waste collection system"""
    
    # Increase waste levels randomly
    for bin in bins:
        if not bin.is_collected:
            bin.waste_level = min(100, bin.waste_level + random.uniform(0.5, 2.0))
    
    # Depot location (where trucks return)
    depot_lat, depot_lon = 40.7128, -74.0060
    
    collections_made = 0
    
    for truck in trucks:
        if truck.status == TruckStatus.IDLE:
            # Find nearest high-priority bin
            target_bin = find_nearest_bin(truck, bins)
            if target_bin:
                truck.status = TruckStatus.COLLECTING
                # Move towards the bin
                truck.lat, truck.lon = move_towards(truck.lat, truck.lon, target_bin.lat, target_bin.lon)
        
        elif truck.status == TruckStatus.COLLECTING:
            # Find the target bin
            target_bin = find_nearest_bin(truck, bins)
            if target_bin:
                distance_to_bin = calculate_distance(truck.lat, truck.lon, target_bin.lat, target_bin.lon)
                
                if distance_to_bin < 0.01:  # Close enough to collect
                    target_bin.is_collected = True
                    target_bin.waste_level = 0
                    truck.current_load += 20  # Add some load
                    collections_made += 1
                    
                    # Check if truck is full or no more bins to collect
                    if truck.current_load >= truck.capacity * 0.8:
                        truck.status = TruckStatus.RETURNING
                    else:
                        truck.status = TruckStatus.IDLE
                else:
                    # Move towards the bin
                    truck.lat, truck.lon = move_towards(truck.lat, truck.lon, target_bin.lat, target_bin.lon)
            else:
                truck.status = TruckStatus.IDLE
        
        elif truck.status == TruckStatus.RETURNING:
            distance_to_depot = calculate_distance(truck.lat, truck.lon, depot_lat, depot_lon)
            
            if distance_to_depot < 0.01:  # Close enough to depot
                truck.current_load = 0  # Empty the truck
                truck.status = TruckStatus.IDLE
            else:
                # Move towards depot
                truck.lat, truck.lon = move_towards(truck.lat, truck.lon, depot_lat, depot_lon)
    
    # Reset collected bins after some time
    for bin in bins:
        if bin.is_collected and random.random() < 0.1:  # 10% chance to reset
            bin.is_collected = False
    
    return {
        "collections_made": collections_made,
        "total_waste_level": sum(bin.waste_level for bin in bins),
        "trucks_active": sum(1 for truck in trucks if truck.status != TruckStatus.IDLE)
    }