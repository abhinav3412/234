from flask import jsonify, render_template, request
from . import camp_manager_bp
from flask_login import current_user, login_required
from app.db_manager import CampManager
from app.resource_allocation import (
    allocate_resources,
    calculate_road_distance_and_duration,
    format_eta
)
from app.models import Camp, Vehicle
from datetime import datetime, timedelta

@camp_manager_bp.route('/')
@login_required
def index():
    return render_template('camp_manager/index.html')

@camp_manager_bp.route('/get_people', methods=['GET'])
@login_required
def get_people():
    camp_id = current_user.associated_camp_id
    list = CampManager.get_people_in_camp(camp_id)  # Fetch people from database
    
    return jsonify(list)

@camp_manager_bp.route('/get_camp_details')
def get_camp_details():
    data = CampManager.get_camp_data(current_user.associated_camp_id)
    return jsonify(data)

@camp_manager_bp.route('/request_resources', methods=['POST'])
@login_required
def request_resources():
    try:
        camp_id = current_user.associated_camp_id
        data = request.get_json()
        
        # Validate required fields
        if not data or 'items' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
            
        # Get camp details
        camp = Camp.query.get_or_404(camp_id)
        
        # Allocate resources
        result = allocate_resources(
            camp_id=camp_id,
            required_items=data['items'],
            priority=data.get('priority', 'general')
        )
        
        if result['success']:
            # Get vehicle details
            vehicle = Vehicle.query.get(result['vehicle_id'])
            
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': {
                    'warehouse': result['warehouse'],
                    'vehicle_id': result['vehicle_id'],
                    'vehicle_capacity': vehicle.capacity,
                    'eta': result['eta'],
                    'items': result['items']
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error requesting resources: {str(e)}'
        }), 500

@camp_manager_bp.route('/get_delivery_status')
@login_required
def get_delivery_status():
    try:
        camp_id = current_user.associated_camp_id
        
        # Get vehicles in transit to this camp
        vehicles = Vehicle.query.filter_by(status='in_transit').all()
        
        # Get camp details
        camp = Camp.query.get_or_404(camp_id)
        camp_location = (camp.coordinates_lat, camp.coordinates_lng)
        
        # Calculate ETAs for each vehicle
        delivery_status = []
        for vehicle in vehicles:
            # Get vehicle's current location (in a real system, this would come from GPS)
            # For now, we'll use the warehouse location
            warehouse = vehicle.warehouse
            current_location = (warehouse.coordinates_lat, warehouse.coordinates_lng)
            
            # Calculate ETA
            _, duration = calculate_road_distance_and_duration(current_location, camp_location)
            if duration:
                eta = datetime.now() + timedelta(seconds=duration)
                formatted_eta = format_eta(duration)
                
                delivery_status.append({
                    'vehicle_id': vehicle.vid,
                    'warehouse': warehouse.name,
                    'eta': formatted_eta,
                    'status': 'in_transit'
                })
        
        return jsonify({
            'success': True,
            'deliveries': delivery_status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error getting delivery status: {str(e)}'
        }), 500