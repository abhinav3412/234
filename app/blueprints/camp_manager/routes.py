from flask import jsonify, render_template
from . import camp_manager_bp
from flask_login import current_user, login_required
from app.db_manager import CampManager
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