"""
SeatWise Helper Utilities
"""
import pymysql
import pymysql.cursors
from functools import wraps
from flask import session, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash

def get_db_connection():
    """Establish and return a MySQL connection with dictionary cursor"""
    config = current_app.config
    connection = pymysql.connect(
        host=config['MYSQL_HOST'],
        port=config['MYSQL_PORT'],
        user=config['MYSQL_USER'],
        password=config['MYSQL_PASSWORD'],
        database=config['MYSQL_DB'],
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )
    return connection

def hash_password(password: str) -> str:
    """Hash password using Werkzeug security"""
    return generate_password_hash(password, method='scrypt')

def verify_password(hashed: str, plain: str) -> bool:
    """Verify plain password against hashed password"""
    if not hashed or not plain:
        return False
    return check_password_hash(hashed, plain)

def api_response(data=None, message="Success", status_code=200):
    """Standardized JSON response format"""
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    return jsonify(response), status_code

def api_error(message="An error occurred", status_code=400, details=None):
    """Standardized error response format"""
    response = {
        "success": False,
        "error": message
    }
    if details:
        response["details"] = details
    return jsonify(response), status_code

def admin_required(f):
    """Decorator to protect admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("is_authenticated") or session.get("role") != "admin":
            return api_error("Unauthorized. Admin access required.", 401)
        return f(*args, **kwargs)
    return decorated_function

def student_required(f):
    """Decorator to protect student routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("is_authenticated") or session.get("role") != "student":
            return api_error("Unauthorized. Student login required.", 401)
        return f(*args, **kwargs)
    return decorated_function
