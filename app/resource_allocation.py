import requests
from datetime import datetime, timedelta
from geopy.distance import geodesic
from concurrent.futures import ThreadPoolExecutor
import heapq

# Ensure no accidental reassignment of 'requests'
assert requests.__name__ == 'requests', "The 'requests' library has been overwritten!"

# Helper function to calculate straight-line distance
def calculate_straight_line_distance(origin, destination):
    """
    Calculates the straight-line distance between two points.
    :param origin: (latitude, longitude) of the starting point
    :param destination: (latitude, longitude) of the ending point
    :return: Distance in kilometers
    """
    return round(geodesic(origin, destination).kilometers, 2)

# Helper function to calculate road distance and duration using OSRM API
def calculate_road_distance_and_duration(origin, destination):
    """
    Fetches the road distance and duration between two points using OSRM API.
    Falls back to straight-line distance if the API fails.
    :param origin: (latitude, longitude) of the starting point
    :param destination: (latitude, longitude) of the ending point
    :return: Road distance in kilometers and duration in seconds
    """
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
    url = f"{base_url}{coords}?overview=false"
    print(f"Requesting OSRM API with URL: {url}")  # Debugging statement
    try:
        response = requests.get(url)
        print(f"Response status code: {response.status_code}")  # Debugging statement
        if response.status_code == 200:
            try:
                data = response.json()
            except ValueError:
                print("Error: Invalid JSON response from OSRM API.")
                print(f"Raw response: {response.text}")
                return calculate_straight_line_distance(origin, destination), None
            # Validate the structure of the response
            if isinstance(data, dict) and data.get('code') == 'Ok':
                routes = data.get('routes')
                if isinstance(routes, list) and len(routes) > 0:
                    route = routes[0]
                    distance_in_kilometers = round(route.get('distance', 0) / 1000, 2)
                    duration_in_seconds = route.get('duration', 0)
                    return distance_in_kilometers, duration_in_seconds
                else:
                    print("Error: No routes found in the response.")
                    return calculate_straight_line_distance(origin, destination), None
            else:
                print(f"Error: Unexpected response from OSRM API: {data}")
                return calculate_straight_line_distance(origin, destination), None
        else:
            print(f"Error: OSRM API returned status code {response.status_code}")
            return calculate_straight_line_distance(origin, destination), None
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return calculate_straight_line_distance(origin, destination), None
    except Exception as e:
        print(f"An error occurred: {e}")
        return calculate_straight_line_distance(origin, destination), None

# Step 1: Request Handling & Warehouse Selection
def find_nearest_warehouse(camp_location, warehouses):
    """
    Finds the nearest warehouse with sufficient stock using road distances.
    :param camp_location: (latitude, longitude) of the camp
    :param warehouses: List of dictionaries containing warehouse details
    :return: Nearest warehouse or None if no warehouse has stock
    """
    nearest_warehouse = None
    min_distance = float('inf')
    for warehouse in warehouses:
        distance, _ = calculate_road_distance_and_duration(camp_location, warehouse['location'])
        if warehouse['stock'] > 0 and distance and distance < min_distance:
            nearest_warehouse = warehouse
            min_distance = distance
    return nearest_warehouse

# Priority Queue for Requests
class PriorityQueue:
    def __init__(self):
        self._queue = []
        self._index = 0

    def push(self, item, priority):
        heapq.heappush(self._queue, (-priority, self._index, item))
        self._index += 1

    def pop(self):
        return heapq.heappop(self._queue)[-1]

    def is_empty(self):
        return len(self._queue) == 0

# Step 2: Vehicle Loading Strategy
class Vehicle:
    def __init__(self, id, capacity):
        self.id = id
        self.capacity = capacity
        self.current_load = 0
        self.deliveries = []  # For general requests
        self.emergency_deliveries = []  # For emergency requests

    def add_delivery(self, camp, quantity, priority):
        if priority == "emergency":
            # Add emergency delivery to the queue
            self.emergency_deliveries.append((camp, quantity))
            print(f"[Vehicle {self.id}] Emergency delivery added: {camp}, Quantity: {quantity}")
        elif priority == "general":
            # Add to general queue if there's space
            if self.current_load + quantity <= self.capacity:
                self.deliveries.append((camp, quantity))
                self.current_load += quantity
                print(f"[Vehicle {self.id}] General delivery added: {camp}, Quantity: {quantity}")
            else:
                print(f"[Vehicle {self.id}] Not enough space for general delivery: {camp}, Quantity: {quantity}")

    def get_all_deliveries(self):
        """
        Combines emergency and general deliveries into a single list.
        """
        return self.emergency_deliveries + self.deliveries

    def process_emergency_deliveries(self, etas):
        """
        Processes emergency deliveries and prints completion messages with ETA.
        :param etas: List of ETA timestamps corresponding to delivery points
        """
        while self.emergency_deliveries:
            camp, quantity = self.emergency_deliveries.pop(0)
            eta = etas.pop(0) if etas else None  # Get the corresponding ETA
            formatted_eta = format_eta((eta - datetime.now()).total_seconds()) if eta else "N/A"
            print(f"[Vehicle {self.id}] Emergency delivery completed: {camp}, Quantity: {quantity}, ETA: {formatted_eta}")
            # Deduct the quantity from the vehicle's current load
            self.current_load -= quantity

    def process_general_deliveries(self, etas):
        """
        Processes general deliveries and prints completion messages with ETA.
        :param etas: List of ETA timestamps corresponding to delivery points
        """
        while self.deliveries:
            camp, quantity = self.deliveries.pop(0)
            eta = etas.pop(0) if etas else None  # Get the corresponding ETA
            formatted_eta = format_eta((eta - datetime.now()).total_seconds()) if eta else "N/A"
            print(f"[Vehicle {self.id}] General delivery completed: {camp}, Quantity: {quantity}, ETA: {formatted_eta}")
            # Deduct the quantity from the vehicle's current load
            self.current_load -= quantity

# Step 3: Route Optimization
def split_delivery_points(delivery_points, max_points=10):
    """
    Splits delivery points into smaller batches to avoid exceeding API limits.
    :param delivery_points: List of (latitude, longitude) points
    :param max_points: Maximum number of points per batch
    :return: List of batches
    """
    return [delivery_points[i:i + max_points] for i in range(0, len(delivery_points), max_points)]

def optimize_route(start_location, delivery_points):
    """
    Optimizes the delivery route using road distances via OSRM API.
    :param start_location: (latitude, longitude) of the starting point
    :param delivery_points: List of (latitude, longitude) for delivery points
    :return: Optimized route as a list of locations and ETAs
    """
    # Prepare coordinates for OSRM API
    coords = ";".join([f"{loc[1]},{loc[0]}" for loc in [start_location] + delivery_points])
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    url = f"{base_url}{coords}?steps=true&geometries=geojson"
    print(f"Requesting OSRM API with URL: {url}")  # Debugging statement
    try:
        response = requests.get(url)
        print(f"Response status code: {response.status_code}")  # Debugging statement
        if response.status_code == 200:
            try:
                data = response.json()
            except ValueError:
                print("Error: Invalid JSON response from OSRM API.")
                print(f"Raw response: {response.text}")
                return None, None
            # Validate the structure of the response
            if isinstance(data, dict) and data.get('code') == 'Ok':
                routes = data.get('routes')
                if isinstance(routes, list) and len(routes) > 0:
                    route = routes[0]
                    geometry = route.get('geometry')
                    if geometry and 'coordinates' in geometry:
                        route_geometry = geometry['coordinates']
                        optimized_route = [(coord[1], coord[0]) for coord in route_geometry]  # Convert to (latitude, longitude)
                        # Calculate ETAs for each delivery point
                        legs = route.get('legs', [])
                        etas = []
                        current_time = datetime.now()
                        for leg in legs:
                            current_time += timedelta(seconds=leg.get('duration', 0))
                            etas.append(current_time)
                        return optimized_route, etas
                    else:
                        print("Error: Missing 'geometry' or 'coordinates' in the response.")
                        return None, None
                else:
                    print("Error: No routes found in the response.")
                    return None, None
            else:
                print(f"Error: Unexpected response from OSRM API: {data}")
                return None, None
        else:
            print(f"Error: OSRM API returned status code {response.status_code}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return None, None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, None

def format_eta(duration_in_seconds):
    """
    Formats the ETA into a human-readable format (minutes, hours, or days).
    :param duration_in_seconds: Duration in seconds
    :return: Formatted ETA string
    """
    if duration_in_seconds < 60 * 60:  # Less than 1 hour
        minutes = round(duration_in_seconds / 60)
        return f"{minutes} minute(s)"
    elif duration_in_seconds < 24 * 60 * 60:  # Less than 1 day
        hours = round(duration_in_seconds / (60 * 60))
        return f"{hours} hour(s)"
    else:  # More than 1 day
        days = round(duration_in_seconds / (24 * 60 * 60))
        return f"{days} day(s)"

def optimize_route_parallel(start_location, delivery_points, max_points=10, max_workers=5):
    """
    Optimizes the delivery route in parallel using OSRM API.
    :param start_location: (latitude, longitude) of the starting point
    :param delivery_points: List of (latitude, longitude) for delivery points
    :param max_points: Maximum number of points per batch
    :param max_workers: Number of parallel workers
    :return: Combined optimized route and ETAs
    """
    batches = split_delivery_points(delivery_points, max_points)
    combined_route = []
    combined_etas = []

    def process_batch(batch):
        return optimize_route(start_location, batch)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_batch, batch) for batch in batches]
        for i, future in enumerate(futures):
            optimized_route, etas = future.result()
            if optimized_route and etas:
                combined_route.extend(optimized_route)
                combined_etas.extend(etas)
            else:
                print(f"Failed to optimize route for batch {i+1}. Skipping...")
    return combined_route, combined_etas

# Example Walkthrough
if __name__ == "__main__":
    # Example data
    camp_location = (12.9716, 77.5946)  # Latitude, Longitude of the camp
    warehouses = [
        {'id': 1, 'location': (12.9716, 77.6), 'stock': 200},
        {'id': 2, 'location': (12.95, 77.65), 'stock': 150},
        {'id': 3, 'location': (13.0, 77.7), 'stock': 100}
    ]

    # Delivery requests
    delivery_requests = [
        {'priority': 'emergency', 'location': (12.98, 77.62), 'quantity': 30},
        {'priority': 'general', 'location': (12.96, 77.64), 'quantity': 50},
        {'priority': 'general', 'location': (12.97, 77.63), 'quantity': 40},
        {'priority': 'emergency', 'location': (12.99, 77.65), 'quantity': 20},
        {'priority': 'general', 'location': (12.98, 77.66), 'quantity': 60},
        {'priority': 'general', 'location': (12.97, 77.67), 'quantity': 20},
        {'priority': 'emergency', 'location': (12.96, 77.68), 'quantity': 10}
    ]

    # Use a priority queue to manage requests
    request_queue = PriorityQueue()
    for request in delivery_requests:
        priority = 1 if request['priority'] == 'emergency' else 0
        request_queue.push(request, priority)

    # Step 1: Find nearest warehouse
    nearest_warehouse = find_nearest_warehouse(camp_location, warehouses)
    if nearest_warehouse:
        print(f"Nearest warehouse found: {nearest_warehouse['id']} at {nearest_warehouse['location']}")
    else:
        print("No warehouse with sufficient stock found.")
        exit()

    # Step 2: Load vehicles
    vehicles = [Vehicle(id=i+1, capacity=100) for i in range(2)]  # Two vehicles with capacity 100 each

    # Process requests based on priority
    while not request_queue.is_empty():
        request = request_queue.pop()
        for vehicle in vehicles:
            if vehicle.current_load + request['quantity'] <= vehicle.capacity:
                vehicle.add_delivery(request['location'], request['quantity'], request['priority'])
                break  # Assign the request to the first available vehicle

    # Optimize routes for all vehicles
    for vehicle in vehicles:
        all_deliveries = vehicle.get_all_deliveries()
        delivery_points = [delivery[0] for delivery in all_deliveries]
        if delivery_points:
            print(f"\nOptimizing route for Vehicle {vehicle.id}...")
            start_location = nearest_warehouse['location']
            optimized_route, etas = optimize_route_parallel(start_location, delivery_points, max_points=10, max_workers=5)
            if optimized_route and etas:
                print(f"\nOptimized route for Vehicle {vehicle.id}:")
                for i, (stop, eta) in enumerate(zip(optimized_route, etas)):
                    duration_in_seconds = (eta - datetime.now()).total_seconds()
                    formatted_eta = format_eta(duration_in_seconds)
                    print(f"  Stop {i+1}: Coordinates: {stop}, ETA: {formatted_eta}")

                # Process deliveries with ETAs
                vehicle.process_emergency_deliveries(etas[:len(vehicle.emergency_deliveries)])
                vehicle.process_general_deliveries(etas[len(vehicle.emergency_deliveries):])