from flask import render_template, jsonify, request, current_app
from flask_login import login_required, current_user
from app.models import Warehouse, Vehicle, db
from app.decorators import warehouse_manager_required
from . import warehouse_manager_bp
from app.db_manager import VehicleManager

@warehouse_manager_bp.route('/')
@login_required
@warehouse_manager_required
def index():
    return render_template('warehouse_manager/index.html')

@warehouse_manager_bp.route('/get_warehouse')
@login_required
@warehouse_manager_required
def get_warehouse():
    try:
        current_app.logger.debug(f"Current user ID: {current_user.uid}")
        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        current_app.logger.debug(f"Found warehouse: {warehouse}")
        if not warehouse:
            current_app.logger.warning(f"No warehouse found for user {current_user.uid}")
            return jsonify({'error': 'No warehouse found'}), 404

        response_data = {
            'id': warehouse.wid,
            'name': warehouse.name,
            'location': warehouse.location,
            'coordinates_lat': warehouse.coordinates_lat,
            'coordinates_lng': warehouse.coordinates_lng,
            'status': warehouse.status,
            'food_capacity': warehouse.food_capacity,
            'water_capacity': warehouse.water_capacity,
            'essential_capacity': warehouse.essential_capacity,
            'clothes_capacity': warehouse.clothes_capacity
        }
        current_app.logger.debug(f"Returning warehouse data: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        current_app.logger.error(f"Error fetching warehouse data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@warehouse_manager_bp.route('/update_warehouse_status', methods=['PUT'])
@login_required
@warehouse_manager_required
def update_warehouse_status():
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400

        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        if not warehouse:
            return jsonify({'error': 'No warehouse found'}), 404

        warehouse.status = new_status
        db.session.commit()

        return jsonify({
            'message': 'Warehouse status updated successfully',
            'status': new_status
        })
    except Exception as e:
        current_app.logger.error(f"Error updating warehouse status: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@warehouse_manager_bp.route('/list_vehicles')
@login_required
@warehouse_manager_required
def list_vehicles():
    try:
        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        if not warehouse:
            return jsonify({'error': 'No warehouse found'}), 404

        vehicles = VehicleManager.list_vehicles_by_warehouse(warehouse.wid)
        if vehicles is None:
            return jsonify([])  # Return empty list if no vehicles found
        return jsonify(vehicles)
    except Exception as e:
        current_app.logger.error(f"Error listing vehicles: {str(e)}")
        return jsonify({'error': str(e)}), 500

@warehouse_manager_bp.route('/add_vehicle', methods=['POST'])
@login_required
@warehouse_manager_required
def add_vehicle():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        vehicle_id = data.get('vehicle_id')
        capacity = data.get('capacity')

        if not vehicle_id or not capacity:
            return jsonify({'error': 'Missing required fields'}), 400

        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        if not warehouse:
            return jsonify({'error': 'No warehouse found'}), 404

        # Check if vehicle_id already exists
        existing_vehicle = Vehicle.query.filter_by(vehicle_id=vehicle_id).first()
        if existing_vehicle:
            return jsonify({'error': 'Vehicle ID already exists'}), 400

        vehicle = VehicleManager.add_vehicle(vehicle_id, capacity, warehouse.wid)
        if not vehicle:
            return jsonify({'error': 'Failed to add vehicle'}), 500

        return jsonify({
            'vid': vehicle.vid,
            'vehicle_id': vehicle.vehicle_id,
            'capacity': vehicle.capacity,
            'status': vehicle.status
        }), 201
    except Exception as e:
        current_app.logger.error(f"Error adding vehicle: {str(e)}")
        return jsonify({'error': str(e)}), 500

@warehouse_manager_bp.route('/update_vehicle/<int:vid>', methods=['PUT'])
@login_required
@warehouse_manager_required
def update_vehicle(vid):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        vehicle = Vehicle.query.get(vid)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        # Verify the vehicle belongs to the user's warehouse
        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        if not warehouse or vehicle.warehouse_id != warehouse.wid:
            return jsonify({'error': 'Unauthorized access'}), 403

        # Update vehicle details
        if 'vehicle_id' in data:
            vehicle.vehicle_id = data['vehicle_id']
        if 'capacity' in data:
            vehicle.capacity = data['capacity']
        if 'status' in data:
            vehicle.status = data['status']

        db.session.commit()
        return jsonify({
            'message': 'Vehicle updated successfully',
            'vehicle': {
                'vid': vehicle.vid,
                'vehicle_id': vehicle.vehicle_id,
                'capacity': vehicle.capacity,
                'status': vehicle.status
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error updating vehicle: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_manager_bp.route('/delete_vehicle/<int:vid>', methods=['DELETE'])
@login_required
@warehouse_manager_required
def delete_vehicle(vid):
    try:
        vehicle = Vehicle.query.get(vid)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        # Verify the vehicle belongs to the user's warehouse
        warehouse = Warehouse.query.filter_by(manager_id=current_user.uid).first()
        if not warehouse or vehicle.warehouse_id != warehouse.wid:
            return jsonify({'error': 'Unauthorized access'}), 403

        db.session.delete(vehicle)
        db.session.commit()
        return jsonify({'message': 'Vehicle deleted successfully'})
    except Exception as e:
        current_app.logger.error(f"Error deleting vehicle: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
