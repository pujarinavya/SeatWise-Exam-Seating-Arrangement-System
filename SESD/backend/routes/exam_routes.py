"""
Examination Management Routes
"""
from flask import Blueprint, request
from utils.helpers import (
    get_db_connection, api_response, api_error, admin_required
)

exam_bp = Blueprint('exams', __name__, url_prefix='/api/exams')

@exam_bp.route('', methods=['GET'])
@admin_required
def get_exams():
    search = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    status = request.args.get('status', '').strip()
    session_time = request.args.get('session', '').strip()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT e.*, 
                       (SELECT COUNT(*) FROM seating_allocations sa WHERE sa.exam_id = e.id) as allocated_students,
                       (SELECT COUNT(DISTINCT sa.hall_id) FROM seating_allocations sa WHERE sa.exam_id = e.id) as allocated_halls,
                       (SELECT MAX(sa.published) FROM seating_allocations sa WHERE sa.exam_id = e.id) as is_published
                FROM exams e 
                WHERE 1=1
            """
            params = []
            if search:
                query += " AND (e.exam_name LIKE %s OR e.subject LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
            if department:
                query += " AND e.department = %s"
                params.append(department)
            if status:
                query += " AND e.status = %s"
                params.append(status)
            if session_time:
                query += " AND e.session = %s"
                params.append(session_time)

            query += " ORDER BY e.exam_date ASC, e.start_time ASC"
            cursor.execute(query, params)
            exams = cursor.fetchall()

        # Format dates/times to ISO strings for JSON
        for ex in exams:
            if ex.get('exam_date'):
                ex['exam_date'] = str(ex['exam_date'])
            if ex.get('start_time'):
                ex['start_time'] = str(ex['start_time'])
            if ex.get('end_time'):
                ex['end_time'] = str(ex['end_time'])
            if ex.get('reporting_time'):
                ex['reporting_time'] = str(ex['reporting_time'])

        return api_response(exams)
    finally:
        conn.close()

@exam_bp.route('/<int:exam_id>', methods=['GET'])
@admin_required
def get_exam(exam_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM exams WHERE id = %s", (exam_id,))
            exam = cursor.fetchone()
        if not exam:
            return api_error("Exam not found.", 404)
        if exam.get('exam_date'):
            exam['exam_date'] = str(exam['exam_date'])
        if exam.get('start_time'):
            exam['start_time'] = str(exam['start_time'])
        if exam.get('end_time'):
            exam['end_time'] = str(exam['end_time'])
        if exam.get('reporting_time'):
            exam['reporting_time'] = str(exam['reporting_time'])
        return api_response(exam)
    finally:
        conn.close()

@exam_bp.route('', methods=['POST'])
@admin_required
def add_exam():
    data = request.get_json() or {}
    name = data.get('exam_name', '').strip()
    subject = data.get('subject', '').strip()
    dept = data.get('department', '').strip()
    year = data.get('year')
    exam_date = data.get('exam_date')
    session_val = data.get('session', 'FN')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    reporting_time = data.get('reporting_time')
    status = data.get('status', 'Scheduled')

    if not all([name, subject, dept, year, exam_date, start_time, end_time, reporting_time]):
        return api_error("All exam details including dates, times and reporting time are required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO exams (exam_name, subject, department, year, exam_date, session, start_time, end_time, reporting_time, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (name, subject, dept, int(year), exam_date, session_val, start_time, end_time, reporting_time, status)
            )
            exam_id = cursor.lastrowid
        conn.commit()
        return api_response({"id": exam_id}, "Examination scheduled successfully.", 201)
    finally:
        conn.close()

@exam_bp.route('/<int:exam_id>', methods=['PUT'])
@admin_required
def update_exam(exam_id):
    data = request.get_json() or {}
    name = data.get('exam_name', '').strip()
    subject = data.get('subject', '').strip()
    dept = data.get('department', '').strip()
    year = data.get('year')
    exam_date = data.get('exam_date')
    session_val = data.get('session', 'FN')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    reporting_time = data.get('reporting_time')
    status = data.get('status', 'Scheduled')

    if not all([name, subject, dept, year, exam_date, start_time, end_time, reporting_time]):
        return api_error("All exam details are required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """UPDATE exams 
                   SET exam_name = %s, subject = %s, department = %s, year = %s, exam_date = %s,
                       session = %s, start_time = %s, end_time = %s, reporting_time = %s, status = %s
                   WHERE id = %s""",
                (name, subject, dept, int(year), exam_date, session_val, start_time, end_time, reporting_time, status, exam_id)
            )
        conn.commit()
        return api_response(None, "Examination updated successfully.")
    finally:
        conn.close()

@exam_bp.route('/<int:exam_id>', methods=['DELETE'])
@admin_required
def delete_exam(exam_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM exams WHERE id = %s", (exam_id,))
        conn.commit()
        return api_response(None, "Examination deleted successfully.")
    finally:
        conn.close()
