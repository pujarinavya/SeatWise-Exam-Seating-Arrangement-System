# SeatWise – Exam Seating Arrangement System

A comprehensive, production-ready Full-Stack University Examination Seating Arrangement System with automatic allocation algorithms, hall matrix visualization, student portal, and multi-format reporting.

---

## 1. Project Overview

**SeatWise** is engineered to eliminate the manual complexity, human error, and time constraints involved in scheduling and arranging seating for university examinations.

### Core Capabilities
- **Role-Based Access Control**: Separate secure portals for Examination Controllers (Admin) and Candidates (Students).
- **Automated Seating Allocation Engine**: Collision-free seat assignment algorithm supporting:
  - **Sequential Roll Number Allocation**: Allocates students in order of roll numbers.
  - **Alternate Department Allocation**: Interleaves students across departments to deter malpractices.
- **Interactive Hall Matrix Visualizer**: Classroom-style visual seat grid displaying podium, blackboard, row-column coordinate seats (`S-R1C1`), student roll numbers, and names.
- **Bulk Excel Student Import**: Import candidate cohorts from `.xlsx` spreadsheets with automatic duplicate detection and validation.
- **Student Seating & Hall Ticket Portal**: Students log in using roll number to view room allocations and download official printed seating slips.
- **Attendance Registers & Reports**: Export hall registers, attendance sheets, and seating charts to Excel (`.xlsx`) or printable PDF format.

---

## 2. Technologies Used

| Tier | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.3, Font Awesome 6 Icons, Chart.js |
| **Backend** | Python 3.10+, Flask 3.0, Flask Blueprints, Werkzeug Security, PyMySQL, pandas, openpyxl, reportlab |
| **Database** | MySQL 8.0+ Relational Database (InnoDB, Foreign Key Constraints, Unique Indexes) |
| **Development Server** | Node.js Express proxy engine for immediate live evaluation |

### Design Theme
- **Theme**: Modern Blue + Navy + White
- **Primary Navy**: `#1E3A8A`
- **Primary Blue**: `#3B82F6`
- **Main Background**: `#F8FAFC`
- **Navigation**: Horizontal Top Navigation Bar

---

## 3. Project Folder Structure

```
SESD/
│
├── frontend/
│   ├── login.html                 # Admin login page
│   ├── student-login.html         # Candidate roll number login
│   ├── dashboard.html             # Admin analytics & KPI dashboard
│   ├── student-dashboard.html     # Student seat view & slip download
│   ├── students.html              # Student CRUD & Excel bulk upload
│   ├── exams.html                 # Examination schedule manager
│   ├── halls.html                 # Hall & room capacity builder
│   ├── seating.html               # Automatic allocation & matrix grid
│   ├── reports.html               # Printable registers & Excel exports
│   │
│   ├── css/
│   │   ├── common.css             # Shared theme variables & navbar styles
│   │   ├── login.css
│   │   ├── student-login.css
│   │   ├── dashboard.css
│   │   ├── student-dashboard.css
│   │   ├── students.css
│   │   ├── exams.css
│   │   ├── halls.css
│   │   ├── seating.css
│   │   └── reports.css
│   │
│   └── js/
│       ├── common.js              # Fetch client, auth check, toast notifications
│       ├── login.js
│       ├── student-login.js
│       ├── dashboard.js           # Chart.js integration & live statistics
│       ├── student-dashboard.js
│       ├── students.js            # Pagination & Excel drag-and-drop
│       ├── exams.js
│       ├── halls.js               # Dynamic capacity calculator (rows × cols)
│       ├── seating.js             # Seating generator & visual matrix
│       └── reports.js
│
└── backend/
    ├── app.py                     # Flask factory & blueprint registration
    ├── config.py                  # Database & session configuration
    ├── requirements.txt           # Python library dependencies
    ├── .env.example               # Environment variable template
    ├── schema.sql                 # MySQL schema with tables, constraints & seeds
    │
    ├── routes/
    │   ├── auth_routes.py         # Login, logout, session verification
    │   ├── student_routes.py      # Student CRUD & Excel import
    │   ├── exam_routes.py         # Exam scheduling & statuses
    │   ├── hall_routes.py         # Hall dimensioning & capacity
    │   ├── seating_routes.py      # Allocation engine & publish API
    │   └── report_routes.py       # Excel & PDF report generation
    │
    ├── services/
    │   └── seating_service.py     # Core sequential & alternate algorithms
    │
    ├── utils/
    │   └── helpers.py             # DB connection, password hashing, auth guards
    │
    └── uploads/                   # Temporary storage for student imports
```

---

## 4. Prerequisites

1. **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/)
2. **MySQL Server 8.0+** or **XAMPP / WampServer**: With MySQL service running on port `3306`
3. **Node.js (Optional, v18+)**: For running the live embedded dev server

---

## 5. Python Environment Setup

### On Windows (Command Prompt / PowerShell)
```cmd
cd SESD\backend
python -m venv venv
venv\Scripts\activate
```

### On Linux / macOS
```bash
cd SESD/backend
python3 -m venv venv
source venv/bin/activate
```

---

## 6. Package Installation

With your virtual environment activated, run:

```cmd
pip install -r requirements.txt
```

Libraries installed:
- `Flask==3.0.3` (Web framework)
- `PyMySQL==1.1.0` (Pure-Python MySQL client)
- `pandas==2.2.2` & `openpyxl==3.1.2` (Excel parsing and exports)
- `reportlab==4.2.0` (PDF document generator)
- `Werkzeug==3.0.2` (Password hashing via scrypt)
- `python-dotenv==1.0.1` (Environment configuration)

---

## 7. MySQL Database Creation

Start your MySQL Command Line Client or open phpMyAdmin:

```sql
CREATE DATABASE seatwise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 8. SQL Schema Import

### On Windows (Command Prompt)
```cmd
mysql -u root -p seatwise_db < schema.sql
```

*(Enter your MySQL password when prompted)*

### Alternatively via MySQL Workbench / phpMyAdmin:
1. Open phpMyAdmin (`http://localhost/phpmyadmin`)
2. Select database `seatwise_db`
3. Click **Import** tab
4. Choose `backend/schema.sql` and click **Go**

---

## 9. Environment Configuration

Copy the `.env.example` file to `.env`:

```cmd
copy .env.example .env     :: Windows
cp .env.example .env       # Linux / macOS
```

Update your `.env` settings:
```ini
SECRET_KEY=seatwise_super_secret_production_key_2026
FLASK_ENV=development
PORT=5000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=seatwise_db
```

---

## 10. Default Login Credentials

### Admin (Examination Controller)
- **Username**: `admin`
- **Password**: `admin123`
- **Portal URL**: `http://localhost:5000/login.html`

### Sample Student (Candidate)
- **Roll Number**: `21CS001`
- **Password**: `student123`
- **Portal URL**: `http://localhost:5000/student-login.html`

---

## 11. How to Run the Flask Application

From the `backend/` directory:

```cmd
python app.py
```

The Flask server will start at:
```
http://127.0.0.1:5000/
```

---

## 12. Complete Testing & Demonstration Workflow

Follow these steps during your project demonstration:

1. **Admin Login**:
   - Navigate to `http://localhost:5000/login.html`.
   - Enter `admin` / `admin123`. Click **Sign In as Admin**.
2. **Dashboard Overview**:
   - The dashboard dynamically loads real stats: Total Students, Total Exams, Total Halls, Total Allocations.
   - Interactive Chart.js charts show students by department and hall load.
3. **Student Management**:
   - Click **Students** in the horizontal top navbar.
   - Click **Add New Student** to register an individual student.
   - Or click **Import Excel** to bulk upload student cohorts using the provided template (`/api/students/template`).
4. **Schedule Examination**:
   - Click **Exams** in navbar.
   - Click **Schedule New Exam**. Specify exam name, subject code, department, date, session (FN/AN), and reporting time.
5. **Hall Management**:
   - Click **Halls** in navbar.
   - Add examination halls (e.g., Ramanujan Hall, 5 rows × 4 columns = 20 seats capacity).
6. **Generate Automatic Seating**:
   - Click **Seating** in navbar.
   - Click **Configure & Generate Seating**.
   - Select your target examination.
   - Select candidate departments (or all).
   - Choose seating strategy:
     - **Sequential Roll Numbers**
     - **Alternate Department Seating**
   - Select examination halls.
   - Click **Generate Seating Preview**.
   - Inspect the interactive preview with capacity validation.
   - Click **Save & Publish Now**.
7. **Inspect Hall Matrix Grid**:
   - In the Seating page, select the exam. View the classroom grid with blackboard, allocated seats (`#EEF4FF`), student roll numbers, and names.
   - Use the live search box to find any student's seat in real-time.
8. **Student Seating Lookup**:
   - Log out or open an incognito tab. Go to `http://localhost:5000/student-login.html`.
   - Sign in with Roll Number `21CS001` and password `student123`.
   - Student dashboard displays their allocated exam, room number, reporting time, and exact seat number (e.g. `S-R1C1`).
   - Click **View & Print Seating Slip** to print their hall ticket.
9. **Export Seating Reports**:
   - Log back into Admin portal and go to **Reports**.
   - Filter by Exam, Hall, or Department.
   - Click **Download Excel** to export official `.xlsx` attendance registers.
   - Click **Print Report** to print official invigilation charts with signature columns.

---

## 13. Seating Algorithm Details

Located in `backend/services/seating_service.py`:
- **Collision Prevention**: Enforces relational database constraints:
  - `uq_student_exam`: A student can never be given two seats in the same exam.
  - `uq_seat_hall_exam`: A seat in a hall can never be allocated twice in the same exam.
- **Capacity Verification**: Compares student count against total hall capacity before executing.
- **Transaction Rollback**: Uses `START TRANSACTION` and atomic replacement to prevent broken partial allocations.

---

## 14. License & Credits

Built for Academic & University Examination Management.  
Designed with **Modern Blue + Navy + White** UI Architecture.
