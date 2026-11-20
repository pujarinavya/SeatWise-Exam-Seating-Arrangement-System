"""
Authentication Routes for Admins and Students
"""
from flask import Blueprint, request, session
from utils.helpers import (
    get_db_connection, verify_password, api_response, api_error
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return api_error("Username and password are required.", 400)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM admins WHERE username = %s LIMIT 1", (username,))
            admin = cursor.fetchone()

        if not admin or not verify_password(admin['password_hash'], password):
            return api_error("Invalid admin credentials.", 401)

        # Regenerate session state
        session.clear()
        session['is_authenticated'] = True
        session['role'] = 'admin'
        session['user_id'] = admin['id']
        session['username'] = admin['username']
        session['full_name'] = admin['full_name']
        session['email'] = admin['email']

        return api_response({
            "id": admin['id'],
            "username": admin['username'],
            "full_name": admin['full_name'],
            "email": admin['email'],
            "role": "admin"
        }, "Admin authentication successful.")
    finally:
        conn.close()

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    data = request.get_json() or {}
    roll_number = data.get('roll_number', '').strip().upper()
    password = data.get('password', '').strip()

    if not roll_number or not password:
        return api_error("Roll Number and password are required.", 400)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM students WHERE roll_number = %s LIMIT 1", (roll_number,))
            student = cursor.fetchone()

        if not student or not verify_password(student['password_hash'], password):
            return api_error("Invalid roll number or password.", 401)

        session.clear()
        session['is_authenticated'] = True
        session['role'] = 'student'
        session['student_id'] = student['id']
        session['roll_number'] = student['roll_number']
        session['full_name'] = student['full_name']
        session['department'] = student['department']
        session['year'] = student['year']

        return api_response({
            "id": student['id'],
            "roll_number": student['roll_number'],
            "full_name": student['full_name'],
            "department": student['department'],
            "year": student['year'],
            "email": student['email'],
            "role": "student"
        }, "Student authentication successful.")
    finally:
        conn.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return api_response(None, "Logged out successfully.")

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    if not session.get('is_authenticated'):
        return api_response({"authenticated": False}, "Not authenticated.", 200)

    user_info = {
        "authenticated": True,
        "role": session.get('role'),
    }
    if session.get('role') == 'admin':
        user_info.update({
            "id": session.get('user_id'),
            "username": session.get('username'),
            "full_name": session.get('full_name'),
            "email": session.get('email')
        })
    else:
        user_info.update({
            "id": session.get('student_id'),
            "roll_number": session.get('roll_number'),
            "full_name": session.get('full_name'),
            "department": session.get('department'),
            "year": session.get('year')
        })

    return api_response(user_info, "Session active.")
