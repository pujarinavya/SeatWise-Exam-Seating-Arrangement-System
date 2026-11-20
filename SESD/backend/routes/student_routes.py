"""
Student Management Routes
"""
import os
import io
import pandas as pd
from flask import Blueprint, request, send_file
from werkzeug.utils import secure_filename
from utils.helpers import (
    get_db_connection, hash_password, api_response, api_error, admin_required
)

student_bp = Blueprint('students', __name__, url_prefix='/api/students')

@student_bp.route('', methods=['GET'])
@admin_required
def get_students():
    search = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    year = request.args.get('year', '').strip()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = "SELECT id, roll_number, full_name, department, year, email, phone, created_at FROM students WHERE 1=1"
            params = []

            if search:
                query += " AND (roll_number LIKE %s OR full_name LIKE %s OR email LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            if department:
                query += " AND department = %s"
                params.append(department)
            if year:
                query += " AND year = %s"
                params.append(int(year))

            # Count total
            count_query = f"SELECT COUNT(*) as total FROM ({query}) as filtered"
            cursor.execute(count_query, params)
            total = cursor.fetchone()['total']

            # Paginate
            query += " ORDER BY roll_number ASC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cursor.execute(query, params)
            students = cursor.fetchall()

        return api_response({
            "students": students,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if limit else 1
        })
    finally:
        conn.close()

@student_bp.route('/<int:student_id>', methods=['GET'])
@admin_required
def get_student(student_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, roll_number, full_name, department, year, email, phone, created_at FROM students WHERE id = %s", (student_id,))
            student = cursor.fetchone()
        if not student:
            return api_error("Student not found.", 404)
        return api_response(student)
    finally:
        conn.close()

@student_bp.route('', methods=['POST'])
@admin_required
def add_student():
    data = request.get_json() or {}
    roll = data.get('roll_number', '').strip().upper()
    name = data.get('full_name', '').strip()
    dept = data.get('department', '').strip().upper()
    year = data.get('year')
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    password = data.get('password', 'student123').strip()

    if not all([roll, name, dept, year, email]):
        return api_error("Roll number, name, department, year, and email are required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check duplicates
            cursor.execute("SELECT id FROM students WHERE roll_number = %s OR email = %s", (roll, email))
            existing = cursor.fetchone()
            if existing:
                return api_error(f"Student with roll number '{roll}' or email '{email}' already exists.")

            pwd_hash = hash_password(password)
            cursor.execute(
                """INSERT INTO students (roll_number, full_name, department, year, email, phone, password_hash)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (roll, name, dept, int(year), email, phone, pwd_hash)
            )
            student_id = cursor.lastrowid
        conn.commit()
        return api_response({"id": student_id, "roll_number": roll}, "Student registered successfully.", 201)
    finally:
        conn.close()

@student_bp.route('/<int:student_id>', methods=['PUT'])
@admin_required
def update_student(student_id):
    data = request.get_json() or {}
    name = data.get('full_name', '').strip()
    dept = data.get('department', '').strip().upper()
    year = data.get('year')
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not all([name, dept, year, email]):
        return api_error("Name, department, year, and email are required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check unique email collision
            cursor.execute("SELECT id FROM students WHERE email = %s AND id != %s", (email, student_id))
            if cursor.fetchone():
                return api_error(f"Email '{email}' is already in use by another student.")

            if password:
                pwd_hash = hash_password(password)
                cursor.execute(
                    """UPDATE students SET full_name = %s, department = %s, year = %s, email = %s, phone = %s, password_hash = %s
                       WHERE id = %s""",
                    (name, dept, int(year), email, phone, pwd_hash, student_id)
                )
            else:
                cursor.execute(
                    """UPDATE students SET full_name = %s, department = %s, year = %s, email = %s, phone = %s
                       WHERE id = %s""",
                    (name, dept, int(year), email, phone, student_id)
                )
        conn.commit()
        return api_response(None, "Student updated successfully.")
    finally:
        conn.close()

@student_bp.route('/<int:student_id>', methods=['DELETE'])
@admin_required
def delete_student(student_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        conn.commit()
        return api_response(None, "Student deleted successfully.")
    finally:
        conn.close()

@student_bp.route('/upload', methods=['POST'])
@admin_required
def upload_students_excel():
    if 'file' not in request.files:
        return api_error("No file provided in form data.")

    file = request.files['file']
    if file.filename == '':
        return api_error("No file selected.")

    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return api_error("Invalid file format. Please upload an Excel file (.xlsx or .xls).")

    try:
        df = pd.read_excel(file)
    except Exception as e:
        return api_error(f"Failed to read Excel file: {str(e)}")

    required_cols = {'roll_number', 'full_name', 'department', 'year', 'email'}
    actual_cols = {str(c).strip().lower() for c in df.columns}

    # Match normalized headers
    col_map = {}
    for c in df.columns:
        norm = str(c).strip().lower().replace(" ", "_")
        col_map[norm] = c

    missing = required_cols - set(col_map.keys())
    if missing:
        return api_error(f"Excel is missing required columns: {', '.join(missing)}. Download the sample template.")

    conn = get_db_connection()
    imported_count = 0
    rejected_records = []

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT roll_number, email FROM students")
            existing_rows = cursor.fetchall()
            existing_rolls = {r['roll_number'].upper() for r in existing_rows}
            existing_emails = {r['email'].lower() for r in existing_rows}

            for idx, row in df.iterrows():
                row_num = idx + 2  # Excel row
                roll = str(row[col_map['roll_number']]).strip().upper()
                name = str(row[col_map['full_name']]).strip()
                dept = str(row[col_map['department']]).strip().upper()
                year_val = row[col_map['year']]
                email = str(row[col_map['email']]).strip().lower()
                phone = str(row.get(col_map.get('phone', ''), '')).strip() if 'phone' in col_map else ""

                if not roll or roll == 'NAN' or not name or name == 'NAN':
                    rejected_records.append({"row": row_num, "roll": roll, "reason": "Missing roll number or name"})
                    continue

                if roll in existing_rolls:
                    rejected_records.append({"row": row_num, "roll": roll, "reason": "Duplicate roll number"})
                    continue

                if email in existing_emails:
                    rejected_records.append({"row": row_num, "roll": roll, "reason": "Duplicate email address"})
                    continue

                try:
                    year_int = int(year_val)
                except Exception:
                    year_int = 1

                pwd_hash = hash_password("student123")
                cursor.execute(
                    """INSERT INTO students (roll_number, full_name, department, year, email, phone, password_hash)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (roll, name, dept, year_int, email, phone, pwd_hash)
                )
                existing_rolls.add(roll)
                existing_emails.add(email)
                imported_count += 1

        conn.commit()
        return api_response({
            "imported_count": imported_count,
            "rejected_count": len(rejected_records),
            "rejected_details": rejected_records
        }, f"Excel processed. {imported_count} students imported successfully.")
    except Exception as e:
        conn.rollback()
        return api_error(f"Database error during Excel import: {str(e)}")
    finally:
        conn.close()

@student_bp.route('/template', methods=['GET'])
@admin_required
def download_student_template():
    """Generates and downloads a clean sample Excel template"""
    sample_data = {
        'roll_number': ['21CS010', '21CS011', '21IT010', '21ECE010'],
        'full_name': ['Naveen Kumar', 'Ananya Sharma', 'Rohan Gupta', 'Pooja Hegde'],
        'department': ['CSE', 'CSE', 'IT', 'ECE'],
        'year': [3, 3, 3, 3],
        'email': ['naveen.k@seatwise.edu', 'ananya.s@seatwise.edu', 'rohan.g@seatwise.edu', 'pooja.h@seatwise.edu'],
        'phone': ['9876500001', '9876500002', '9876500003', '9876500004']
    }
    df = pd.DataFrame(sample_data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Students')
    output.seek(0)
    return send_file(
        output,
        download_name='SeatWise_Students_Template.xlsx',
        as_attachment=True,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
