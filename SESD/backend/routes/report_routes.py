"""
Reporting and Analytics Routes
Supports Excel and PDF generation for Hall-wise, Exam-wise, and Student seating allocations.
"""
import io
import pandas as pd
from flask import Blueprint, request, send_file
from utils.helpers import (
    get_db_connection, api_response, api_error, admin_required
)

report_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@report_bp.route('/dashboard-stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Counters
            cursor.execute("SELECT COUNT(*) as count FROM students")
            total_students = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM exams")
            total_exams = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM halls")
            total_halls = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM seating_allocations")
            total_allocations = cursor.fetchone()['count']

            cursor.execute("SELECT SUM(capacity) as total FROM halls")
            total_capacity = cursor.fetchone()['total'] or 0

            # Department breakdown
            cursor.execute("SELECT department, COUNT(*) as count FROM students GROUP BY department ORDER BY count DESC")
            dept_stats = cursor.fetchall()

            # Hall capacity stats
            cursor.execute("""
                SELECT h.hall_name, h.capacity,
                       (SELECT COUNT(DISTINCT sa.student_id) FROM seating_allocations sa WHERE sa.hall_id = h.id) as allocated
                FROM halls h
                ORDER BY h.capacity DESC
                LIMIT 6
            """)
            hall_stats = cursor.fetchall()

            # Recent exams
            cursor.execute("""
                SELECT id, exam_name, subject, exam_date, session, status,
                       (SELECT COUNT(*) FROM seating_allocations sa WHERE sa.exam_id = exams.id) as alloc_count,
                       (SELECT MAX(published) FROM seating_allocations sa WHERE sa.exam_id = exams.id) as published
                FROM exams
                ORDER BY exam_date ASC
                LIMIT 5
            """)
            recent_exams = cursor.fetchall()
            for r in recent_exams:
                if r.get('exam_date'):
                    r['exam_date'] = str(r['exam_date'])

            # Recent students
            cursor.execute("""
                SELECT id, roll_number, full_name, department, year, created_at
                FROM students
                ORDER BY created_at DESC
                LIMIT 5
            """)
            recent_students = cursor.fetchall()
            for s in recent_students:
                if s.get('created_at'):
                    s['created_at'] = str(s['created_at'])

        return api_response({
            "total_students": total_students,
            "total_exams": total_exams,
            "total_halls": total_halls,
            "total_allocations": total_allocations,
            "total_capacity": total_capacity,
            "dept_stats": dept_stats,
            "hall_stats": hall_stats,
            "recent_exams": recent_exams,
            "recent_students": recent_students
        })
    finally:
        conn.close()

@report_bp.route('/seating/data', methods=['GET'])
@admin_required
def get_report_data():
    exam_id = request.args.get('exam_id')
    hall_id = request.args.get('hall_id')
    department = request.args.get('department')
    search = request.args.get('search', '').strip()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT sa.id, sa.seat_number, sa.row_number, sa.column_number, sa.published,
                       e.id as exam_id, e.exam_name, e.subject, e.exam_date, e.session, e.start_time, e.end_time,
                       s.id as student_id, s.roll_number, s.full_name as student_name, s.department, s.year,
                       h.id as hall_id, h.hall_name, h.building, h.room_number
                FROM seating_allocations sa
                JOIN exams e ON sa.exam_id = e.id
                JOIN students s ON sa.student_id = s.id
                JOIN halls h ON sa.hall_id = h.id
                WHERE 1=1
            """
            params = []
            if exam_id:
                query += " AND sa.exam_id = %s"
                params.append(int(exam_id))
            if hall_id:
                query += " AND sa.hall_id = %s"
                params.append(int(hall_id))
            if department:
                query += " AND s.department = %s"
                params.append(department)
            if search:
                query += " AND (s.roll_number LIKE %s OR s.full_name LIKE %s OR h.hall_name LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

            query += " ORDER BY e.exam_date ASC, h.hall_name ASC, sa.row_number ASC, sa.column_number ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()

            for r in rows:
                if r.get('exam_date'):
                    r['exam_date'] = str(r['exam_date'])
                if r.get('start_time'):
                    r['start_time'] = str(r['start_time'])
                if r.get('end_time'):
                    r['end_time'] = str(r['end_time'])

        return api_response(rows)
    finally:
        conn.close()

@report_bp.route('/seating/excel', methods=['GET'])
@admin_required
def export_seating_excel():
    exam_id = request.args.get('exam_id')
    hall_id = request.args.get('hall_id')

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT e.exam_name AS 'Exam Name',
                       e.subject AS 'Subject',
                       e.exam_date AS 'Date',
                       e.session AS 'Session',
                       h.hall_name AS 'Hall Name',
                       h.room_number AS 'Room Number',
                       sa.seat_number AS 'Seat Number',
                       sa.row_number AS 'Row',
                       sa.column_number AS 'Column',
                       s.roll_number AS 'Student Roll Number',
                       s.full_name AS 'Student Name',
                       s.department AS 'Department',
                       s.year AS 'Year'
                FROM seating_allocations sa
                JOIN exams e ON sa.exam_id = e.id
                JOIN students s ON sa.student_id = s.id
                JOIN halls h ON sa.hall_id = h.id
                WHERE 1=1
            """
            params = []
            if exam_id:
                query += " AND sa.exam_id = %s"
                params.append(int(exam_id))
            if hall_id:
                query += " AND sa.hall_id = %s"
                params.append(int(hall_id))

            query += " ORDER BY e.exam_date ASC, h.hall_name ASC, sa.row_number ASC, sa.column_number ASC"
            cursor.execute(query, params)
            data = cursor.fetchall()

        if not data:
            return api_error("No seating data found for the selected criteria.")

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Seating Arrangement')
        output.seek(0)

        filename = f"SeatWise_Arrangement_Exam_{exam_id or 'All'}.xlsx"
        return send_file(
            output,
            download_name=filename,
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    finally:
        conn.close()
