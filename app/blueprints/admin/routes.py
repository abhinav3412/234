from flask import render_template, request, jsonify, flash
from flask_login import login_required
from app.db_manager import get_table_count
from app.data import load_sensor_configs, save_sensor_configs, generate_sensor_data, save_sensor_data_to_json
from . import admin_bp
import json
import os
from app.models import User, Camp, Warehouse, Sensor
from app.extensions import db

def get_table_count():
    """Get count of records from various tables"""
    return {
        'users': User.query.count(),
        'camps': Camp.query.count(),
        'warehouses': Warehouse.query.count(),
        'sensors': Sensor.query.count()
    }

@admin_bp.route('/')
@login_required
def index():
    table_count_list = get_table_count()
    return render_template('admin/index.html', table_count_list=table_count_list)

@admin_bp.route('/user')
@login_required
def user():
    return render_template('admin/user.html')

@admin_bp.route('/camp')
@login_required
def camp():
    return render_template('admin/camp.html')

@admin_bp.route('/warehouse')
@login_required
def warehouse():
    return render_template('admin/warehouse.html')

@admin_bp.route('/sensor')
@login_required
def sensor():
    try:
        # Load sensor configs
        sensor_configs = load_sensor_configs()
        
        # Load sensor data to get status information
        try:
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'r') as f:
                sensor_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            sensor_data = []
        
        # Combine configs with their current status
        sensors_with_status = []
        for config in sensor_configs:
            sensor_info = config.copy()
            # Find matching sensor data
            matching_data = next((data for data in sensor_data if data['id'] == config['id']), None)
            
            # Set the status from sensor data if available
            sensor_info['status'] = matching_data['status'] if matching_data else 'Initializing'
            
            # Ensure operational_status is included
            if 'operational_status' not in sensor_info:
                sensor_info['operational_status'] = 'Active'  # Default value
                
            sensors_with_status.append(sensor_info)
        
        return render_template('admin/sensor.html', sensors=sensors_with_status)
    except Exception as e:
        flash(f"Error loading sensors: {str(e)}", "error")
        return render_template('admin/sensor.html', sensors=[])

@admin_bp.route('/add_sensor', methods=['POST'])
@login_required
def add_sensor():
    try:
        # Log received form data
        print("Received form data:", request.form)
        
        # Get form data
        sensor_name = request.form.get('sensor_name')
        try:
            latitude = float(request.form.get('latitude'))
            longitude = float(request.form.get('longitude'))
        except (TypeError, ValueError):
            print("Invalid latitude or longitude format")
            return jsonify({
                'success': False, 
                'message': 'Latitude and longitude must be valid numbers'
            })

        soil_type = request.form.get('soil_type')

        print(f"Parsed values - name: {sensor_name}, lat: {latitude}, lng: {longitude}, soil: {soil_type}")

        # Validate required fields
        if not all([sensor_name, soil_type]):
            print("Missing required fields")
            return jsonify({'success': False, 'message': 'All fields are required'})

        # Validate latitude range (-90 to 90)
        if not -90 <= latitude <= 90:
            print(f"Invalid latitude value: {latitude}")
            return jsonify({
                'success': False, 
                'message': 'Latitude must be between -90 and 90 degrees'
            })

        # Validate longitude range (-180 to 180)
        if not -180 <= longitude <= 180:
            print(f"Invalid longitude value: {longitude}")
            return jsonify({
                'success': False, 
                'message': 'Longitude must be between -180 and 180 degrees'
            })

        # Load existing sensor configs
        sensor_configs = load_sensor_configs()
        print("Loaded existing configs:", sensor_configs)
        
        # Check for duplicate coordinates with a small tolerance (approximately 10 meters)
        COORD_TOLERANCE = 0.0001  # roughly 10 meters
        for sensor in sensor_configs:
            if (abs(sensor['latitude'] - latitude) < COORD_TOLERANCE and 
                abs(sensor['longitude'] - longitude) < COORD_TOLERANCE):
                print(f"Found duplicate coordinates at lat: {latitude}, lng: {longitude}")
                return jsonify({
                    'success': False, 
                    'message': 'A sensor already exists too close to these coordinates. Please choose a different location.'
                })
        
        # Generate new sensor ID
        new_id = len(sensor_configs) + 1
        
        # Create new sensor config
        new_sensor = {
            'id': new_id,
            'name': sensor_name,
            'latitude': latitude,
            'longitude': longitude,
            'soil_type': soil_type,
            'operational_status': 'Active'  # Set default operational status
        }
        
        print("Created new sensor config:", new_sensor)
        
        # Add new sensor to configs
        sensor_configs.append(new_sensor)
        
        # Save updated configs
        save_sensor_configs(sensor_configs)
        print("Saved updated sensor configs")
        
        # Generate initial sensor data
        sensor_data = generate_sensor_data(new_sensor)
        print("Generated initial sensor data:", sensor_data)
        
        if sensor_data is None:
            print("Failed to generate sensor data")
            return jsonify({'success': False, 'message': 'Failed to generate sensor data'})
        
        # Load existing sensor data
        existing_data = []
        try:
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'r') as f:
                existing_data = json.load(f)
                print("Loaded existing sensor data:", len(existing_data), "sensors")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print("No existing sensor data found:", str(e))
            pass
        
        # Add new sensor data
        existing_data.append(sensor_data)
        
        # Save updated sensor data
        save_sensor_data_to_json(existing_data)
        print("Saved updated sensor data")
        
        return jsonify({'success': True, 'message': 'Sensor added successfully'})
        
    except ValueError as e:
        print("ValueError:", str(e))
        return jsonify({'success': False, 'message': 'Invalid input values'})
    except Exception as e:
        print("Unexpected error:", str(e))
        return jsonify({'success': False, 'message': str(e)})

@admin_bp.route('/delete_sensor/<int:sensor_id>', methods=['POST'])
@login_required
def delete_sensor(sensor_id):
    try:
        # Load existing sensor configs
        sensor_configs = load_sensor_configs()
        
        # Find and remove the sensor
        sensor_configs = [s for s in sensor_configs if s['id'] != sensor_id]
        
        # Save updated configs
        save_sensor_configs(sensor_configs)
        
        # Load existing sensor data
        try:
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'r') as f:
                sensor_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            sensor_data = []
        
        # Remove data for deleted sensor
        sensor_data = [s for s in sensor_data if s['id'] != sensor_id]
        
        # Save updated sensor data
        save_sensor_data_to_json(sensor_data)
        
        return jsonify({'success': True, 'message': 'Sensor deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@admin_bp.route('/get_sensors')
@login_required
def get_sensors():
    try:
        # Load sensor configs with better error handling
        try:
            sensors = load_sensor_configs()
            if not isinstance(sensors, list):
                print("Warning: sensors is not a list, defaulting to empty list")
                sensors = []
        except Exception as e:
            print(f"Error loading sensor configs: {str(e)}")
            sensors = []
        
        # Load sensor data to get status information
        try:
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'r') as f:
                sensor_data = json.load(f)
                if not isinstance(sensor_data, list):
                    print("Warning: sensor_data is not a list, defaulting to empty list")
                    sensor_data = []
                # Filter out any null values
                sensor_data = [s for s in sensor_data if s is not None]
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading sensor data: {str(e)}")
            sensor_data = []
        except Exception as e:
            print(f"Unexpected error loading sensor data: {str(e)}")
            sensor_data = []
        
        # Combine configs with their current status and affected radius
        sensors_with_status = []
        for config in sensors:
            try:
                sensor_info = config.copy()
                # Find matching sensor data
                matching_data = next((data for data in sensor_data if data['id'] == config['id']), None)
                if matching_data:
                    sensor_info.update({
                        'status': matching_data.get('status', 'Normal'),
                        'affected_radius': matching_data.get('affected_radius', 1000),
                        'rainfall': matching_data.get('rainfall', 0),
                        'forecasted_rainfall': matching_data.get('forecasted_rainfall', 0),
                        'soil_saturation': matching_data.get('soil_saturation', 0),
                        'slope': matching_data.get('slope', 0),
                        'seismic_activity': matching_data.get('seismic_activity', 'None'),
                        'risk_level': matching_data.get('risk_level', 'Low'),
                        'predicted_landslide_time': matching_data.get('predicted_landslide_time', 'N/A'),
                        'operational_status': matching_data.get('operational_status', config.get('operational_status', 'Active'))
                    })
                else:
                    sensor_info.update({
                        'status': 'Normal',
                        'affected_radius': 1000,
                        'rainfall': 0,
                        'forecasted_rainfall': 0,
                        'soil_saturation': 0,
                        'slope': 0,
                        'seismic_activity': 'None',
                        'risk_level': 'Low',
                        'predicted_landslide_time': 'N/A',
                        'operational_status': config.get('operational_status', 'Active')
                    })
                sensors_with_status.append(sensor_info)
            except Exception as e:
                print(f"Error processing sensor {config.get('id', 'unknown')}: {str(e)}")
                continue
        
        return jsonify(sensors_with_status)
    except Exception as e:
        print(f"Error in get_sensors route: {str(e)}")
        return jsonify([]), 200  # Return empty array instead of error to prevent frontend issues

@admin_bp.route('/get_sensor/<int:sensor_id>')
@login_required
def get_sensor(sensor_id):
    """Get a specific sensor's details"""
    try:
        # Load sensor configs
        sensor_configs = load_sensor_configs()
        
        # Find the sensor
        sensor = next((s for s in sensor_configs if s['id'] == sensor_id), None)
        
        if sensor is None:
            return jsonify({'success': False, 'message': 'Sensor not found'})
            
        # Return sensor details
        return jsonify({
            'success': True,
            'sensor': {
                'id': sensor['id'],
                'name': sensor['name'],
                'latitude': sensor['latitude'],
                'longitude': sensor['longitude'],
                'soil_type': sensor['soil_type'],
                'operational_status': sensor.get('operational_status', 'Active')
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@admin_bp.route('/update_sensor/<int:sensor_id>', methods=['POST'])
@login_required
def update_sensor(sensor_id):
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'latitude', 'longitude', 'soil_type', 'operational_status']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Load current sensor configs
        sensor_configs = load_sensor_configs()
        
        # Find the sensor to update
        sensor_index = next((i for i, s in enumerate(sensor_configs) if s['id'] == sensor_id), None)
        if sensor_index is None:
            return jsonify({'error': 'Sensor not found'}), 404
        
        # Check for duplicate coordinates
        for i, sensor in enumerate(sensor_configs):
            if i != sensor_index and sensor['latitude'] == float(data['latitude']) and sensor['longitude'] == float(data['longitude']):
                return jsonify({'error': 'A sensor already exists at these coordinates'}), 400
        
        # Update sensor config
        sensor_configs[sensor_index].update({
            'name': data['name'],
            'latitude': float(data['latitude']),
            'longitude': float(data['longitude']),
            'soil_type': data['soil_type'],
            'operational_status': data['operational_status']
        })
        
        # Save updated configs
        save_sensor_configs(sensor_configs)
        
        # Update sensor data if it exists
        try:
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'r') as f:
                sensor_data = json.load(f)
            
            # Find and update sensor data
            for sensor in sensor_data:
                if sensor['id'] == sensor_id:
                    sensor.update({
                        'name': data['name'],
                        'latitude': float(data['latitude']),
                        'longitude': float(data['longitude']),
                        'soil_type': data['soil_type'],
                        'operational_status': data['operational_status']
                    })
                    break
            
            # Save updated sensor data
            with open(os.path.join('app', 'static', 'data', 'sensor_data.json'), 'w') as f:
                json.dump(sensor_data, f, indent=4)
                
        except (FileNotFoundError, json.JSONDecodeError):
            # If sensor data file doesn't exist or is invalid, that's okay
            pass
        
        return jsonify({'message': 'Sensor updated successfully'})
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input value: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Error updating sensor: {str(e)}'}), 500

# Commented out warehouse routes to avoid conflicts with admin_api.py
# @admin_bp.route('/create_warehouse', methods=['POST'])
# @login_required
# def create_warehouse():
#     try:
#         data = request.get_json()
#         
#         # Validate required fields
#         required_fields = ['name', 'location', 'capacity']
#         for field in required_fields:
#             if field not in data or not data[field]:
#                 return jsonify({'error': f'Missing or invalid field: {field}'}), 400
# 
#         # Create new warehouse
#         new_warehouse = Warehouse(
#             name=data['name'],
#             location=data['location'],
#             capacity=int(data['capacity']),
#             manager_id=data.get('manager_id')  # Optional
#         )
# 
#         db.session.add(new_warehouse)
#         db.session.commit()
# 
#         return jsonify({
#             'message': 'Warehouse created successfully',
#             'warehouse': {
#                 'wid': new_warehouse.wid,
#                 'name': new_warehouse.name,
#                 'location': new_warehouse.location,
#                 'capacity': new_warehouse.capacity,
#                 'manager_id': new_warehouse.manager_id,
#                 'status': new_warehouse.status
#             }
#         }), 201
# 
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({'error': str(e)}), 500
# 
# @admin_bp.route('/update_warehouse/<int:warehouse_id>', methods=['PUT'])
# @login_required
# def update_warehouse(warehouse_id):
#     try:
#         warehouse = Warehouse.query.get_or_404(warehouse_id)
#         data = request.get_json()
# 
#         # Update fields if provided
#         if 'name' in data:
#             warehouse.name = data['name']
#         if 'location' in data:
#             warehouse.location = data['location']
#         if 'capacity' in data:
#             warehouse.capacity = int(data['capacity'])
#         if 'manager_id' in data:
#             warehouse.manager_id = data['manager_id']
#         if 'status' in data:
#             warehouse.status = data['status']
# 
#         db.session.commit()
# 
#         return jsonify({
#             'message': 'Warehouse updated successfully',
#             'warehouse': {
#                 'wid': warehouse.wid,
#                 'name': warehouse.name,
#                 'location': warehouse.location,
#                 'capacity': warehouse.capacity,
#                 'manager_id': warehouse.manager_id,
#                 'status': warehouse.status
#             }
#         }), 200
# 
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({'error': str(e)}), 500
# 
# @admin_bp.route('/delete_warehouse/<int:warehouse_id>', methods=['DELETE'])
# @login_required
# def delete_warehouse(warehouse_id):
#     try:
#         warehouse = Warehouse.query.get_or_404(warehouse_id)
#         warehouse_name = warehouse.name
#         
#         db.session.delete(warehouse)
#         db.session.commit()
# 
#         return jsonify({'message': f'Warehouse {warehouse_id} deleted successfully'}), 200
# 
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({'error': str(e)}), 500

# @admin_bp.route('/get_all_users')
# @login_required
# def get_all_users():
#     """
#     List all user
#     """
#     try:
#         # Use CampManager to fetch all users
#         users = UserManager.list_all_users()

#         # Return the list of users as JSON
#         return jsonify(users), 200
#     except Exception as e:
#         # Handle any unexpected errors
#         return jsonify({"error": str(e)}), 500


# @admin_bp.route('/add_user', methods=['GET', 'POST'])
# @login_required
# def add_user():
#     """
#     Add a new user (Admin functionality).
#     """
#     try:
#         # Extract form data
#         email    = 'test@gmail.com' #request.values.get('email')
#         username = 'test' #request.values.get('username','user')
#         password = 'test' #request.values.get('password')
#         role     = 'test' #request.values.get('role')
        
#         # Add the user using UserManager
#         response, status_code = UserManager.add_user(
#             username=username,
#             email=email,
#             password=password,
#             role=role
#         )

#         if status_code == 201:  # Successfully added
#             print('\n\n\nsuccess')
#             # return redirect(url_for('admin.index'))
#             return jsonify({'mesgae':'success'})
#         else:
#             flash(response.get("error", "Failed to add user."), "danger")
#             return {'error':'Failed to add user'}

#     except Exception as e:
#         print('\n\n\n\n\nerror',e)
#         # return redirect(url_for('admin.index'))
#         return jsonify({'error':'Failed'})

#     # GET request: Render the add user form
#     return redirect(url_for('admin.index'))

# @admin_bp.route('/edit_user/<int:uid>', methods=['GET','POST'])
# def edit_user(uid):
#     username = request.form.get('username')
#     email = request.form.get('email')
#     location = request.form.get('location')
#     mobile = request.form.get('mobile')
#     role = request.form.get('role')
    
#     update_data = {}
#     if username:
#         update_data['username'] = username
#     if email:
#         existing_user = User.query.filter_by(email=email).first()
#         if existing_user and existing_user.uid != uid:
#             return redirect(url_for('admin_bp.edit_user', uid=uid))
#         update_data['email'] = email
#     if location:
#         update_data['location'] = location
#     if mobile:
#         update_data['mobile'] = mobile
#     if role:
#         update_data['role'] = role

#     updated_user = UserManager.update_user(uid, **update_data)



# @admin_bp.route('/delete_user/<int:uid>', methods=['POST','DELETE'])
# @login_required
# def delete_user(uid):
#     """
#     Delete a user by their ID.
#     """
#     deleted = UserManager.delete_user(uid)
#     if deleted:
#         flash("User deleted successfully!", "success")
#         return jsonify({'message':f'user {uid} deleted'})
#     else:
#         flash("Failed to delete user.", "danger")
#         return jsonify({'message':f'deletion failed'})
        
#     # return redirect(url_for('admin_bp.list_users'))
    






# @admin_bp.route('/get_all_camps')
# @login_required
# def get_all_camps():
#     """
#     List all camp info
#     """
    
#     try:
#         # Use CampManager to fetch all camps
#         camps = CampManager.list_all_camps()

#         # Return the list of camps as JSON
#         return jsonify(camps), 200
#     except Exception as e:
#         # Handle any unexpected errors
#         return jsonify({"error": str(e)}), 500


# @admin_bp.route('/add_camp', methods=['GET','POST'])
# @login_required
# def add_camp():
#     camp_name = 'name'
#     location = 'location'
#     status = 'status'
#     capacity = 'capacity'
#     num_people = 'num_people'
#     food_stock = 'food_stock'
#     water_stock = 'water_stock'
#     contact_number = 'contact_no'
#     lat = 10.2
#     lng = 15.445
    
#     newcamp = CampManager.create_camp(
#         camp_name=camp_name,
#         location=location,
#         coordinates_lat=lat,
#         coordinates_lng=lng,
#         capacity=capacity,
#         contact_number=contact_number,
#         status=status
#     )
    
#     return jsonify({'message':'camp created'})

# # @admin_bp.route('')