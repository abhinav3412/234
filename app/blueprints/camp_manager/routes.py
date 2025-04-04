from flask import jsonify, render_template, request
from . import camp_manager_bp
from flask_login import current_user, login_required
from app.db_manager import CampManager, CampNotFound
from app.resource_allocation import (
    allocate_resources,
    calculate_road_distance_and_duration,
    format_eta
)
from app.models import Camp, Vehicle, UserRequest
from app import db
from datetime import datetime, timedelta

@camp_manager_bp.route('/')
@login_required
def index():
    # Get the camp managed by the current user
    camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
    if not camp:
        return render_template('camp_manager/no_camp.html')
    
    return render_template('camp_manager/index.html', camp=camp)

@camp_manager_bp.route('/get_people', methods=['GET'])
@login_required
def get_people():
    """Get all people in the camp managed by the current camp manager."""
    try:
        # Get the camp managed by the current camp manager
        camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
        if not camp:
            return jsonify({"error": "No camp assigned"}), 404
        
        # Get the people list from the camp
        people_list = camp.people_list or []
        
        # Return the list of people
        return jsonify(people_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@camp_manager_bp.route('/get_camp_details')
@login_required
def get_camp_details():
    # Get the camp managed by the current camp manager
    camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
    if not camp:
        return jsonify({"error": "No camp assigned"}), 404
        
    try:
        data = CampManager.get_camp_data(camp.cid)
        return jsonify(data)
    except CampNotFound as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@camp_manager_bp.route('/request_resources', methods=['POST'])
@login_required
def request_resources():
    try:
        # Get the camp managed by the current camp manager
        camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
        if not camp:
            return jsonify({
                'success': False,
                'message': 'No camp assigned'
            }), 404
            
        data = request.get_json()
        
        # Validate required fields
        if not data or 'items' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
            
        # Allocate resources
        result = allocate_resources(
            camp_id=camp.cid,
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

@camp_manager_bp.route('/get_user_requests')
@login_required
def get_user_requests():
    """Get all user requests for the camp managed by the current camp manager."""
    try:
        # Get the camp managed by the current camp manager
        camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
        if not camp:
            return jsonify({"error": "No camp assigned"}), 404
            
        # Get all requests for this camp
        requests = UserRequest.query.filter_by(camp_id=camp.cid).order_by(UserRequest.created_at.desc()).all()
        
        # Format the requests for JSON response
        requests_list = [{
            'id': req.id,
            'name': req.name,
            'phone': req.phone,
            'number_slots': req.number_slots,
            'priority': req.priority,
            'status': req.status,
            'created_at': req.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } for req in requests]
        
        return jsonify(requests_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@camp_manager_bp.route('/update_request_status', methods=['POST'])
@login_required
def update_request_status():
    """Update the status of a user request."""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        status = data.get('status')
        
        if not request_id or not status:
            return jsonify({"error": "Missing request_id or status"}), 400
            
        # Get the request
        user_request = UserRequest.query.get_or_404(request_id)
        
        # Verify the request belongs to the camp managed by the current user
        camp = Camp.query.filter_by(camp_head_id=current_user.uid).first()
        if not camp or user_request.camp_id != camp.cid:
            return jsonify({"error": "Unauthorized"}), 403
            
        # Update the request status
        user_request.status = status
        if status == 'Approved':
            # Update camp occupancy
            camp.current_occupancy += user_request.number_slots
            
            # Get current people list
            people_list = camp.people_list or []
            
            # Add new people to the list, checking for duplicates
            for i in range(user_request.number_slots):
                new_person = {
                    'name': f"{user_request.name} ({i+1})",
                    'phone': user_request.phone,
                    'entry_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                # Check if person already exists
                is_duplicate = any(
                    person['name'] == new_person['name'] and 
                    person['phone'] == new_person['phone']
                    for person in people_list
                )
                
                if not is_duplicate:
                    people_list.append(new_person)
            
            # Update camp's people list
            camp.people_list = people_list
            
        db.session.commit()
        
        return jsonify({"message": "Request status updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500