"""
Examination Hall Management Routes
"""
from flask import Blueprint, request
from utils.helpers import (
    get_db_connection, api_response, api_error, admin_required
)

hall_bp = Blueprint('halls', __name__, url_prefix='/api/halls')

@hall_bp.route('', methods=['GET'])
@admin_required
def get_halls():
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = "SELECT * FROM halls WHERE 1=1"
            params = []
            if search:
                query += " AND (hall_name LIKE %s OR building LIKE %s OR room_number LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            if status:
                query += " AND status = %s"
                params.append(status)

            query += " ORDER BY hall_name ASC"
            cursor.execute(query, params)
            halls = cursor.fetchall()
        return api_response(halls)
    finally:
        conn.close()

@hall_bp.route('/<int:hall_id>', methods=['GET'])
@admin_required
def get_hall(hall_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM halls WHERE id = %s", (hall_id,))
            hall = cursor.fetchone()
        if not hall:
            return api_error("Hall not found.", 404)
        return api_response(hall)
    finally:
        conn.close()

@hall_bp.route('', methods=['POST'])
@admin_required
def add_hall():
    data = request.get_json() or {}
    name = data.get('hall_name', '').strip()
    building = data.get('building', '').strip()
    room = data.get('room_number', '').strip()
    rows = data.get('total_rows')
    cols = data.get('total_columns')
    status = data.get('status', 'Available')

    if not all([name, building, room, rows, cols]):
        return api_error("Hall name, building, room number, rows and columns are required.")

    try:
        rows_val = int(rows)
        cols_val = int(cols)
        if rows_val <= 0 or cols_val <= 0:
            return api_error("Rows and columns must be positive numbers greater than 0.")
    except ValueError:
        return api_error("Rows and columns must be valid integers.")

    capacity = rows_val * cols_val

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check unique room in building
            cursor.execute("SELECT id FROM halls WHERE building = %s AND room_number = %s", (building, room))
            if cursor.fetchone():
                return api_error(f"Hall with room '{room}' in building '{building}' already exists.")

            cursor.execute(
                """INSERT INTO halls (hall_name, building, room_number, total_rows, total_columns, capacity, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (name, building, room, rows_val, cols_val, capacity, status)
            )
            hall_id = cursor.lastrowid
        conn.commit()
        return api_response({"id": hall_id, "capacity": capacity}, "Examination hall created successfully.", 201)
    finally:
        conn.close()

@hall_bp.route('/<int:hall_id>', methods=['PUT'])
@admin_required
def update_hall(hall_id):
    data = request.get_json() or {}
    name = data.get('hall_name', '').strip()
    building = data.get('building', '').strip()
    room = data.get('room_number', '').strip()
    rows = data.get('total_rows')
    cols = data.get('total_columns')
    status = data.get('status', 'Available')

    if not all([name, building, room, rows, cols]):
        return api_error("All hall details are required.")

    try:
        rows_val = int(rows)
        cols_val = int(cols)
        if rows_val <= 0 or cols_val <= 0:
            return api_error("Rows and columns must be greater than 0.")
    except ValueError:
        return api_error("Rows and columns must be valid integers.")

    capacity = rows_val * cols_val

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM halls WHERE building = %s AND room_number = %s AND id != %s", (building, room, hall_id))
            if cursor.fetchone():
                return api_error(f"Another hall with room '{room}' in building '{building}' already exists.")

            cursor.execute(
                """UPDATE halls 
                   SET hall_name = %s, building = %s, room_number = %s, total_rows = %s, total_columns = %s, capacity = %s, status = %s
                   WHERE id = %s""",
                (name, building, room, rows_val, cols_val, capacity, status, hall_id)
            )
        conn.commit()
        return api_response({"capacity": capacity}, "Hall updated successfully.")
    finally:
        conn.close()

@hall_bp.route('/<int:hall_id>', methods=['DELETE'])
@admin_required
def delete_hall(hall_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM halls WHERE id = %s", (hall_id,))
        conn.commit()
        return api_response(None, "Hall deleted successfully.")
    finally:
        conn.close()
