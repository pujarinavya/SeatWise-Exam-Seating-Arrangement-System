"""
SeatWise Automatic Seating Allocation Service
Implements Sequential and Alternate Department allocation strategies.
"""
from typing import List, Dict, Any, Tuple

class SeatingAllocationService:

    @staticmethod
    def prepare_student_sequence(students: List[Dict[str, Any]], strategy: str = "sequential") -> List[Dict[str, Any]]:
        """
        Sort and interleave students based on chosen strategy.
        - 'sequential': Sorted by Roll Number.
        - 'alternate': Grouped by department, then interleaved round-robin so adjacent seats
          are from different departments where possible.
        """
        if not students:
            return []

        if strategy == "alternate":
            # Group students by department
            dept_groups: Dict[str, List[Dict[str, Any]]] = {}
            for s in sorted(students, key=lambda x: x['roll_number']):
                dept = s.get('department', 'GEN')
                if dept not in dept_groups:
                    dept_groups[dept] = []
                dept_groups[dept].append(s)

            # Round-robin interleave across departments
            interleaved = []
            keys = sorted(dept_groups.keys())
            max_len = max(len(grp) for grp in dept_groups.values())
            for i in range(max_len):
                for k in keys:
                    if i < len(dept_groups[k]):
                        interleaved.append(dept_groups[k][i])
            return interleaved
        else:
            # Sequential: strictly by roll number
            return sorted(students, key=lambda x: x['roll_number'])

    @staticmethod
    def generate_seating_plan(
        exam: Dict[str, Any],
        halls: List[Dict[str, Any]],
        students: List[Dict[str, Any]],
        strategy: str = "sequential"
    ) -> Dict[str, Any]:
        """
        Generates memory preview of seating allocation before saving to database.
        Checks total capacity against student count.
        Maps each student to (hall_id, row, col, seat_number).
        """
        total_students = len(students)
        total_capacity = sum(h.get('capacity', 0) for h in halls)

        if total_students == 0:
            return {
                "success": False,
                "error": "No eligible students found for the selected examination criteria."
            }

        if not halls:
            return {
                "success": False,
                "error": "No examination halls selected."
            }

        if total_capacity < total_students:
            return {
                "success": False,
                "error": f"Insufficient hall capacity! Total students: {total_students}, Selected halls capacity: {total_capacity}. Please add more halls."
            }

        ordered_students = SeatingAllocationService.prepare_student_sequence(students, strategy)

        allocations = []
        hall_previews = []
        student_idx = 0

        for hall in halls:
            h_id = hall['id']
            h_name = hall['hall_name']
            room_no = hall['room_number']
            rows = hall['total_rows']
            cols = hall['total_columns']
            h_capacity = hall['capacity']

            hall_seats = []
            hall_alloc_count = 0

            for r in range(1, rows + 1):
                row_seats = []
                for c in range(1, cols + 1):
                    seat_num = f"S-R{r}C{c}"
                    allocated_student = None

                    if student_idx < total_students:
                        st = ordered_students[student_idx]
                        allocated_student = {
                            "student_id": st['id'],
                            "roll_number": st['roll_number'],
                            "full_name": st['full_name'],
                            "department": st['department'],
                            "year": st['year']
                        }
                        allocations.append({
                            "exam_id": exam['id'],
                            "student_id": st['id'],
                            "hall_id": h_id,
                            "seat_number": seat_num,
                            "row_number": r,
                            "column_number": c,
                            "student_roll": st['roll_number'],
                            "student_name": st['full_name'],
                            "student_dept": st['department']
                        })
                        student_idx += 1
                        hall_alloc_count += 1

                    row_seats.append({
                        "seat_number": seat_num,
                        "row": r,
                        "col": c,
                        "is_occupied": allocated_student is not None,
                        "student": allocated_student
                    })
                hall_seats.append(row_seats)

            hall_previews.append({
                "hall_id": h_id,
                "hall_name": h_name,
                "room_number": room_no,
                "building": hall.get('building', ''),
                "total_rows": rows,
                "total_columns": cols,
                "capacity": h_capacity,
                "allocated_count": hall_alloc_count,
                "seats_grid": hall_seats
            })

            if student_idx >= total_students:
                # Still map remaining halls empty if any
                pass

        return {
            "success": True,
            "exam": exam,
            "strategy": strategy,
            "total_students": total_students,
            "total_allocated": student_idx,
            "total_capacity": total_capacity,
            "allocations": allocations,
            "hall_previews": hall_previews
        }
