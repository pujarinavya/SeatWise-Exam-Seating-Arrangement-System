"""
Seating Arrangement and Allocation Routes
"""
from flask import Blueprint, request, session
from utils.helpers import (
    get_db_connection, api_response, api_error, admin_required, student_required
)
from services.seating_service import SeatingAllocationService

seating_bp = Blueprint('seating', __name__, url_prefix='/api/seating')

@seating_bp.route('/generate', methods=['POST'])
@admin_required
def generate_seating():
    """
    Simulates / previews automatic seating allocation.
    Admin provides:
    - exam_id
    - hall_ids (array)
    - departments (optional filter array)
    - year (optional filter)
    - strategy ('sequential' or 'alternate')
    """
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    hall_ids = data.get('hall_ids', [])
    departments = data.get('departments', [])
    year = data.get('year')
    strategy = data.get('strategy', 'sequential')

    if not exam_id or not hall_ids:
        return api_error("Please select an examination and at least one examination hall.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Fetch Exam
            cursor.execute("SELECT * FROM exams WHERE id = %s", (exam_id,))
            exam = cursor.fetchone()
            if not exam:
                return api_error("Selected examination not found.", 404)

            # 2. Fetch Selected Halls
            format_strings = ','.join(['%s'] * len(hall_ids))
            cursor.execute(f"SELECT * FROM halls WHERE id IN ({format_strings}) AND status = 'Available'", tuple(hall_ids))
            halls = cursor.fetchall()
            if not halls:
                return api_error("None of the selected halls are currently available.")

            # 3. Fetch Eligible Students
            student_query = "SELECT id, roll_number, full_name, department, year, email FROM students WHERE 1=1"
            student_params = []

            # If department filter specified, use it; otherwise default to exam department or all
            if departments and len(departments) > 0 and 'ALL' not in departments:
                dept_placeholders = ','.join(['%s'] * len(departments))
                student_query += f" AND department IN ({dept_placeholders})"
                student_params.extend(departments)
            elif exam.get('department') and exam['department'] != 'ALL':
                student_query += " AND department = %s"
                student_params.append(exam['department'])

            if year:
                student_query += " AND year = %s"
                student_params.append(int(year))
            elif exam.get('year'):
                student_query += " AND year = %s"
                student_params.append(int(exam['year']))

            student_query += " ORDER BY roll_number ASC"
            cursor.execute(student_query, student_params)
            students = cursor.fetchall()

        # Run allocation algorithm
        result = SeatingAllocationService.generate_seating_plan(exam, halls, students, strategy)
        if not result.get("success"):
            return api_error(result.get("error", "Allocation failed."))

        return api_response(result, "Seating preview generated successfully.")
    finally:
        conn.close()

@seating_bp.route('/save', methods=['POST'])
@admin_required
def save_seating():
    """
    Saves the generated seating plan into database using transaction.
    """
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    allocations = data.get('allocations', [])
    publish_now = bool(data.get('publish', False))

    if not exam_id or not allocations:
        return api_error("No seating allocations provided to save.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check exam exists
            cursor.execute("SELECT id FROM exams WHERE id = %s", (exam_id,))
            if not cursor.fetchone():
                return api_error("Examination not found.", 404)

            # Atomic transaction: remove existing allocations for this exam
            cursor.execute("DELETE FROM seating_allocations WHERE exam_id = %s", (exam_id,))

            insert_query = """
                INSERT INTO seating_allocations 
                (exam_id, student_id, hall_id, seat_number, row_number, column_number, published)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            rows_to_insert = [
                (
                    exam_id,
                    a['student_id'],
                    a['hall_id'],
                    a['seat_number'],
                    a['row_number'],
                    a['column_number'],
                    1 if publish_now else 0
                )
                for a in allocations
            ]
            cursor.executemany(insert_query, rows_to_insert)

        conn.commit()
        return api_response({
            "exam_id": exam_id,
            "saved_count": len(allocations),
            "published": publish_now
        }, f"Successfully saved {len(allocations)} seat allocations.")
    except Exception as e:
        conn.rollback()
        return api_error(f"Failed to save allocations: {str(e)}")
    finally:
        conn.close()

@seating_bp.route('/publish', methods=['POST'])
@admin_required
def publish_seating():
    data = request.get_json() or {}
    exam_id = data.get('exam_id')
    published_state = data.get('published', 1)

    if not exam_id:
        return api_error("Exam ID is required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE seating_allocations SET published = %s WHERE exam_id = %s", (published_state, exam_id))
            affected = cursor.rowcount
        conn.commit()
        state_str = "published" if published_state else "unpublished"
        return api_response({"affected_rows": affected}, f"Seating arrangements {state_str} for students.")
    finally:
        conn.close()

@seating_bp.route('/exam/<int:exam_id>', methods=['GET'])
@admin_required
def get_exam_seating(exam_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Exam info
            cursor.execute("SELECT * FROM exams WHERE id = %s", (exam_id,))
            exam = cursor.fetchone()
            if not exam:
                return api_error("Exam not found.", 404)

            # Allocations joined with student and hall
            cursor.execute("""
                SELECT sa.id as alloc_id, sa.seat_number, sa.row_number, sa.column_number, sa.published,
                       s.id as student_id, s.roll_number, s.full_name as student_name, s.department, s.year,
                       h.id as hall_id, h.hall_name, h.building, h.room_number, h.total_rows, h.total_columns
                FROM seating_allocations sa
                JOIN students s ON sa.student_id = s.id
                JOIN halls h ON sa.hall_id = h.id
                WHERE sa.exam_id = %s
                ORDER BY h.hall_name ASC, sa.row_number ASC, sa.column_number ASC
            """, (exam_id,))
            allocations = cursor.fetchall()

            # Group by hall for visual rendering
            halls_map = {}
            for a in allocations:
                hid = a['hall_id']
                if hid not in halls_map:
                    halls_map[hid] = {
                        "hall_id": hid,
                        "hall_name": a['hall_name'],
                        "building": a['building'],
                        "room_number": a['room_number'],
                        "total_rows": a['total_rows'],
                        "total_columns": a['total_columns'],
                        "seats": []
                    }
                halls_map[hid]["seats"].append(a)

        return api_response({
            "exam": exam,
            "total_allocated": len(allocations),
            "is_published": allocations[0]['published'] if allocations else 0,
            "allocations": allocations,
            "halls": list(halls_map.values())
        })
    finally:
        conn.close()

@seating_bp.route('/student', methods=['GET'])
@student_required
def get_student_seating():
    """
    Returns only the authenticated student's published examination seating arrangements.
    """
    student_id = session.get('student_id')
    if not student_id:
        return api_error("Student session not found.", 401)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT sa.id as allocation_id, sa.seat_number, sa.row_number, sa.column_number,
                       e.id as exam_id, e.exam_name, e.subject, e.exam_date, e.session, e.start_time, e.end_time, e.reporting_time,
                       h.hall_name, h.building, h.room_number
                FROM seating_allocations sa
                JOIN exams e ON sa.exam_id = e.id
                JOIN halls h ON sa.hall_id = h.id
                WHERE sa.student_id = %s AND sa.published = 1
                ORDER BY e.exam_date ASC, e.start_time ASC
            """, (student_id,))
            allocations = cursor.fetchall()

            # Format dates/times
            for a in allocations:
                if a.get('exam_date'):
                    a['exam_date'] = str(a['exam_date'])
                if a.get('start_time'):
                    a['start_time'] = str(a['start_time'])
                if a.get('end_time'):
                    a['end_time'] = str(a['end_time'])
                if a.get('reporting_time'):
                    a['reporting_time'] = str(a['reporting_time'])

        return api_response(allocations)
    finally:
        conn.close()

@seating_bp.route('/exam/<int:exam_id>', methods=['DELETE'])
@admin_required
def clear_exam_seating(exam_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM seating_allocations WHERE exam_id = %s", (exam_id,))
            deleted = cursor.rowcount
        conn.commit()
        return api_response({"deleted_count": deleted}, "Seating allocations cleared successfully.")
    finally:
        conn.close()
