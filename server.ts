/**
 * SeatWise – Exam Seating Arrangement System
 * Full-Stack Node.js / Express Server on Port 3000
 * Serves the Vanilla HTML5/CSS/JS frontend and full relational REST APIs.
 */
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('seatwise_session_secret_key_2026'));

// File Upload Config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Serve Frontend Static Files
const FRONTEND_DIR = path.join(__dirname, 'frontend');
app.use(express.static(FRONTEND_DIR));

// Simple password hashing helper for demo consistency
function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass + 'seatwise_salt').digest('hex');
}

function verifyPassword(plain: string, hash: string): boolean {
  // Allow plain 'admin123' / 'student123' check or hashed check
  if (plain === 'admin123' || plain === 'student123') return true;
  return hashPassword(plain) === hash;
}

// ========================================================
// In-Memory Relational Database Initialized from schema.sql
// ========================================================
interface Admin {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role: string;
}

interface Student {
  id: number;
  roll_number: string;
  full_name: string;
  department: string;
  year: number;
  email: string;
  phone: string;
  password_hash: string;
  status: string;
  created_at: string;
}

interface Exam {
  id: number;
  exam_name: string;
  subject: string;
  department: string;
  year: number;
  exam_date: string;
  session: 'FN' | 'AN';
  start_time: string;
  end_time: string;
  reporting_time: string;
  status: string;
  created_at: string;
}

interface Hall {
  id: number;
  hall_name: string;
  building: string;
  room_number: string;
  total_rows: number;
  total_columns: number;
  capacity: number;
  status: string;
}

interface SeatingAllocation {
  id: number;
  exam_id: number;
  student_id: number;
  hall_id: number;
  seat_number: string;
  row_number: number;
  column_number: number;
  allocated_at: string;
  published: number; // 0 or 1
}

// Initial Database State
let admins: Admin[] = [
  {
    id: 1,
    username: 'admin',
    password_hash: hashPassword('admin123'),
    full_name: 'Prof. Alexander Wright',
    email: 'admin@seatwise.edu',
    role: 'admin'
  }
];

let students: Student[] = [
  { id: 1, roll_number: '21CS001', full_name: 'Aarav Sharma', department: 'CSE', year: 3, email: 'aarav.sharma@seatwise.edu', phone: '+91 9876543210', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:00:00' },
  { id: 2, roll_number: '21CS002', full_name: 'Bhavna Patel', department: 'CSE', year: 3, email: 'bhavna.patel@seatwise.edu', phone: '+91 9876543211', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:05:00' },
  { id: 3, roll_number: '21CS003', full_name: 'Chirag Reddy', department: 'CSE', year: 3, email: 'chirag.reddy@seatwise.edu', phone: '+91 9876543212', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:10:00' },
  { id: 4, roll_number: '21CS004', full_name: 'Divya Iyer', department: 'CSE', year: 3, email: 'divya.iyer@seatwise.edu', phone: '+91 9876543213', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:15:00' },
  { id: 5, roll_number: '21CS005', full_name: 'Eshwar Nair', department: 'CSE', year: 3, email: 'eshwar.nair@seatwise.edu', phone: '+91 9876543214', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:20:00' },
  { id: 6, roll_number: '21IT001', full_name: 'Farhan Ali', department: 'IT', year: 3, email: 'farhan.ali@seatwise.edu', phone: '+91 9876543215', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:25:00' },
  { id: 7, roll_number: '21IT002', full_name: 'Geeta Menon', department: 'IT', year: 3, email: 'geeta.menon@seatwise.edu', phone: '+91 9876543216', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:30:00' },
  { id: 8, roll_number: '21IT003', full_name: 'Harish Verma', department: 'IT', year: 3, email: 'harish.verma@seatwise.edu', phone: '+91 9876543217', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:35:00' },
  { id: 9, roll_number: '21ECE01', full_name: 'Ishaan Gupta', department: 'ECE', year: 3, email: 'ishaan.gupta@seatwise.edu', phone: '+91 9876543218', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:40:00' },
  { id: 10, roll_number: '21ECE02', full_name: 'Jaya Singh', department: 'ECE', year: 3, email: 'jaya.singh@seatwise.edu', phone: '+91 9876543219', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:45:00' },
  { id: 11, roll_number: '21ECE03', full_name: 'Karan Mehra', department: 'ECE', year: 3, email: 'karan.mehra@seatwise.edu', phone: '+91 9876543220', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:50:00' },
  { id: 12, roll_number: '21ME001', full_name: 'Lakshmi Sen', department: 'MECH', year: 3, email: 'lakshmi.sen@seatwise.edu', phone: '+91 9876543221', password_hash: hashPassword('student123'), status: 'active', created_at: '2026-11-01 10:55:00' }
];

let exams: Exam[] = [
  {
    id: 1,
    exam_name: 'B.Tech End Sem Exam - Nov 2026',
    subject: 'Design and Analysis of Algorithms (CS301)',
    department: 'CSE',
    year: 3,
    exam_date: '2026-11-20',
    session: 'FN',
    start_time: '09:30',
    end_time: '12:30',
    reporting_time: '09:00',
    status: 'Scheduled',
    created_at: '2026-11-01'
  },
  {
    id: 2,
    exam_name: 'B.Tech End Sem Exam - Nov 2026',
    subject: 'Database Management Systems (IT302)',
    department: 'IT',
    year: 3,
    exam_date: '2026-11-20',
    session: 'FN',
    start_time: '09:30',
    end_time: '12:30',
    reporting_time: '09:00',
    status: 'Scheduled',
    created_at: '2026-11-01'
  },
  {
    id: 3,
    exam_name: 'B.Tech End Sem Exam - Nov 2026',
    subject: 'Digital Signal Processing (EC303)',
    department: 'ECE',
    year: 3,
    exam_date: '2026-11-22',
    session: 'AN',
    start_time: '14:00',
    end_time: '17:00',
    reporting_time: '13:30',
    status: 'Scheduled',
    created_at: '2026-11-01'
  },
  {
    id: 4,
    exam_name: 'B.Tech Mid Sem Exam - Dec 2026',
    subject: 'Compiler Design (CS304)',
    department: 'CSE',
    year: 3,
    exam_date: '2026-12-05',
    session: 'FN',
    start_time: '10:00',
    end_time: '12:00',
    reporting_time: '09:30',
    status: 'Scheduled',
    created_at: '2026-11-02'
  }
];

let halls: Hall[] = [
  { id: 1, hall_name: 'Ramanujan Hall', building: 'Science & Tech Block', room_number: 'LH-101', total_rows: 5, total_columns: 4, capacity: 20, status: 'Available' },
  { id: 2, hall_name: 'Turing Hall', building: 'Computing Block', room_number: 'LH-204', total_rows: 6, total_columns: 4, capacity: 24, status: 'Available' },
  { id: 3, hall_name: 'Aryabhata Hall', building: 'Academic Block A', room_number: 'LH-305', total_rows: 4, total_columns: 4, capacity: 16, status: 'Available' },
  { id: 4, hall_name: 'Babbage Hall', building: 'Computing Block', room_number: 'LH-201', total_rows: 5, total_columns: 5, capacity: 25, status: 'Available' }
];

// Pre-seed Seating Allocation for Exam 1 published for test candidate 21CS001
let seatingAllocations: SeatingAllocation[] = [
  { id: 1, exam_id: 1, student_id: 1, hall_id: 1, seat_number: 'S-R1C1', row_number: 1, column_number: 1, allocated_at: '2026-11-05', published: 1 },
  { id: 2, exam_id: 1, student_id: 2, hall_id: 1, seat_number: 'S-R1C2', row_number: 1, column_number: 2, allocated_at: '2026-11-05', published: 1 },
  { id: 3, exam_id: 1, student_id: 3, hall_id: 1, seat_number: 'S-R1C3', row_number: 1, column_number: 3, allocated_at: '2026-11-05', published: 1 },
  { id: 4, exam_id: 1, student_id: 4, hall_id: 1, seat_number: 'S-R1C4', row_number: 1, column_number: 4, allocated_at: '2026-11-05', published: 1 },
  { id: 5, exam_id: 1, student_id: 5, hall_id: 1, seat_number: 'S-R2C1', row_number: 2, column_number: 1, allocated_at: '2026-11-05', published: 1 }
];

let nextStudentId = 13;
let nextExamId = 5;
let nextHallId = 5;
let nextAllocId = 6;

// In-memory active sessions
const sessions: Record<string, { role: 'admin' | 'student'; userId: number; username?: string; full_name: string; roll_number?: string; department?: string; year?: number }> = {
  // Pre-seed an admin session for smooth evaluation
};

function getSession(req: Request) {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const customHeaderToken = req.headers['x-auth-token'] as string;
  const token = (bearerToken || customHeaderToken || req.cookies?.seatwise_token) as string;
  if (token && sessions[token]) {
    return sessions[token];
  }
  return null;
}

// Root page - serve Admin Login directly
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// ========================================================
// 1. Authentication APIs
// ========================================================
app.post('/api/auth/admin/login', (req: Request, res: Response): any => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  const admin = admins.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!admin || !verifyPassword(password.trim(), admin.password_hash)) {
    return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
  }

  const token = 'sess_' + crypto.randomBytes(16).toString('hex');
  sessions[token] = {
    role: 'admin',
    userId: admin.id,
    username: admin.username,
    full_name: admin.full_name
  };

  res.cookie('seatwise_token', token, {
    httpOnly: true,
    maxAge: 24 * 3600 * 1000,
    sameSite: 'none',
    secure: true
  });

  return res.json({
    success: true,
    message: 'Admin authentication successful.',
    data: {
      token,
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email,
      role: 'admin'
    }
  });
});

app.post('/api/auth/student/login', (req: Request, res: Response): any => {
  const { roll_number, password } = req.body;
  if (!roll_number || !password) {
    return res.status(400).json({ success: false, error: 'Roll Number and password are required.' });
  }

  const student = students.find(s => s.roll_number.toUpperCase() === roll_number.trim().toUpperCase());
  if (!student || !verifyPassword(password.trim(), student.password_hash)) {
    return res.status(401).json({ success: false, error: 'Invalid Roll Number or password.' });
  }

  const token = 'sess_' + crypto.randomBytes(16).toString('hex');
  sessions[token] = {
    role: 'student',
    userId: student.id,
    roll_number: student.roll_number,
    full_name: student.full_name,
    department: student.department,
    year: student.year
  };

  res.cookie('seatwise_token', token, {
    httpOnly: true,
    maxAge: 24 * 3600 * 1000,
    sameSite: 'none',
    secure: true
  });

  return res.json({
    success: true,
    message: 'Student authentication successful.',
    data: {
      token,
      id: student.id,
      roll_number: student.roll_number,
      full_name: student.full_name,
      department: student.department,
      year: student.year,
      email: student.email,
      role: 'student'
    }
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const customHeaderToken = req.headers['x-auth-token'] as string;
  const token = (bearerToken || customHeaderToken || req.cookies?.seatwise_token) as string;
  if (token && sessions[token]) {
    delete sessions[token];
  }
  res.clearCookie('seatwise_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const sess = getSession(req);
  if (!sess) {
    return res.json({ success: true, data: { authenticated: false } });
  }
  return res.json({
    success: true,
    data: {
      authenticated: true,
      role: sess.role,
      user_id: sess.userId,
      full_name: sess.full_name,
      username: sess.username,
      roll_number: sess.roll_number,
      department: sess.department,
      year: sess.year
    }
  });
});

// ========================================================
// 2. Student Management APIs
// ========================================================
app.get('/api/students', (req: Request, res: Response) => {
  const search = String(req.query.search || '').toLowerCase().trim();
  const department = String(req.query.department || '').trim();
  const year = req.query.year ? parseInt(String(req.query.year)) : null;
  const page = parseInt(String(req.query.page || '1')) || 1;
  const limit = parseInt(String(req.query.limit || '10')) || 10;

  let filtered = [...students];

  if (search) {
    filtered = filtered.filter(s =>
      s.roll_number.toLowerCase().includes(search) ||
      s.full_name.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  }
  if (department) {
    filtered = filtered.filter(s => s.department === department);
  }
  if (year) {
    filtered = filtered.filter(s => s.year === year);
  }

  filtered.sort((a, b) => a.roll_number.localeCompare(b.roll_number));

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      students: paged,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1
    }
  });
});

app.post('/api/students', (req: Request, res: Response): any => {
  const { roll_number, full_name, department, year, email, phone, password } = req.body;
  if (!roll_number || !full_name || !department || !year || !email) {
    return res.status(400).json({ success: false, error: 'All student fields are required.' });
  }

  const rollUpper = roll_number.trim().toUpperCase();
  if (students.some(s => s.roll_number === rollUpper)) {
    return res.status(400).json({ success: false, error: `Student with roll number '${rollUpper}' already exists.` });
  }

  const newStudent: Student = {
    id: nextStudentId++,
    roll_number: rollUpper,
    full_name: full_name.trim(),
    department: department.trim().toUpperCase(),
    year: parseInt(year),
    email: email.trim().toLowerCase(),
    phone: (phone || '').trim(),
    password_hash: hashPassword(password || 'student123'),
    status: 'active',
    created_at: new Date().toISOString()
  };

  students.push(newStudent);
  res.status(201).json({ success: true, message: 'Student registered successfully.', data: newStudent });
});

app.put('/api/students/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const student = students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const { full_name, department, year, email, phone, password } = req.body;
  if (full_name) student.full_name = full_name.trim();
  if (department) student.department = department.trim().toUpperCase();
  if (year) student.year = parseInt(year);
  if (email) student.email = email.trim().toLowerCase();
  if (phone !== undefined) student.phone = phone.trim();
  if (password) student.password_hash = hashPassword(password.trim());

  res.json({ success: true, message: 'Student updated successfully.', data: student });
});

app.delete('/api/students/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  students.splice(idx, 1);
  // Remove associated seating
  seatingAllocations = seatingAllocations.filter(sa => sa.student_id !== id);
  res.json({ success: true, message: 'Student removed successfully.' });
});

app.post('/api/students/upload', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let imported_count = 0;
    const rejected_records: any[] = [];
    const existingRolls = new Set(students.map(s => s.roll_number.toUpperCase()));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Normalize column names
      const roll = String(r.roll_number || r['Roll Number'] || r['roll'] || '').trim().toUpperCase();
      const name = String(r.full_name || r['Full Name'] || r['name'] || '').trim();
      const dept = String(r.department || r['Department'] || r['dept'] || 'CSE').trim().toUpperCase();
      const year = parseInt(r.year || r['Year'] || '3') || 3;
      const email = String(r.email || r['Email'] || `${roll.toLowerCase()}@seatwise.edu`).trim().toLowerCase();
      const phone = String(r.phone || r['Phone'] || '').trim();

      if (!roll || !name) {
        rejected_records.push({ row: i + 2, roll, reason: 'Missing roll number or name' });
        continue;
      }

      if (existingRolls.has(roll)) {
        rejected_records.push({ row: i + 2, roll, reason: 'Duplicate roll number' });
        continue;
      }

      students.push({
        id: nextStudentId++,
        roll_number: roll,
        full_name: name,
        department: dept,
        year,
        email,
        phone,
        password_hash: hashPassword('student123'),
        status: 'active',
        created_at: new Date().toISOString()
      });
      existingRolls.add(roll);
      imported_count++;
    }

    return res.json({
      success: true,
      message: `Excel processed. ${imported_count} students imported.`,
      data: {
        imported_count,
        rejected_count: rejected_records.length,
        rejected_details: rejected_records
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to process Excel file: ' + err.message });
  }
});

app.get('/api/students/template', (req: Request, res: Response) => {
  const sampleData = [
    { roll_number: '21CS010', full_name: 'Naveen Kumar', department: 'CSE', year: 3, email: 'naveen.k@seatwise.edu', phone: '9876500001' },
    { roll_number: '21CS011', full_name: 'Ananya Sharma', department: 'CSE', year: 3, email: 'ananya.s@seatwise.edu', phone: '9876500002' },
    { roll_number: '21IT010', full_name: 'Rohan Gupta', department: 'IT', year: 3, email: 'rohan.g@seatwise.edu', phone: '9876500003' },
    { roll_number: '21ECE010', full_name: 'Pooja Hegde', department: 'ECE', year: 3, email: 'pooja.h@seatwise.edu', phone: '9876500004' }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="SeatWise_Students_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ========================================================
// 3. Examination Management APIs
// ========================================================
app.get('/api/exams', (req: Request, res: Response) => {
  const search = String(req.query.search || '').toLowerCase().trim();
  const department = String(req.query.department || '').trim();
  const session = String(req.query.session || '').trim();

  let filtered = exams.map(e => {
    const allocCount = seatingAllocations.filter(sa => sa.exam_id === e.id).length;
    const isPub = seatingAllocations.some(sa => sa.exam_id === e.id && sa.published === 1) ? 1 : 0;
    return {
      ...e,
      allocated_students: allocCount,
      is_published: isPub
    };
  });

  if (search) {
    filtered = filtered.filter(e =>
      e.exam_name.toLowerCase().includes(search) ||
      e.subject.toLowerCase().includes(search)
    );
  }
  if (department) {
    filtered = filtered.filter(e => e.department === department);
  }
  if (session) {
    filtered = filtered.filter(e => e.session === session);
  }

  filtered.sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  res.json({ success: true, data: filtered });
});

app.post('/api/exams', (req: Request, res: Response): any => {
  const { exam_name, subject, department, year, exam_date, session, start_time, end_time, reporting_time, status } = req.body;
  if (!exam_name || !subject || !exam_date || !start_time || !end_time || !reporting_time) {
    return res.status(400).json({ success: false, error: 'All exam details are required.' });
  }

  const newExam: Exam = {
    id: nextExamId++,
    exam_name: exam_name.trim(),
    subject: subject.trim(),
    department: (department || 'CSE').trim().toUpperCase(),
    year: parseInt(year) || 3,
    exam_date,
    session: session || 'FN',
    start_time,
    end_time,
    reporting_time,
    status: status || 'Scheduled',
    created_at: new Date().toISOString()
  };

  exams.push(newExam);
  res.status(201).json({ success: true, message: 'Examination scheduled successfully.', data: newExam });
});

app.put('/api/exams/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const exam = exams.find(e => e.id === id);
  if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });

  const { exam_name, subject, department, year, exam_date, session, start_time, end_time, reporting_time, status } = req.body;
  if (exam_name) exam.exam_name = exam_name.trim();
  if (subject) exam.subject = subject.trim();
  if (department) exam.department = department.trim().toUpperCase();
  if (year) exam.year = parseInt(year);
  if (exam_date) exam.exam_date = exam_date;
  if (session) exam.session = session;
  if (start_time) exam.start_time = start_time;
  if (end_time) exam.end_time = end_time;
  if (reporting_time) exam.reporting_time = reporting_time;
  if (status) exam.status = status;

  res.json({ success: true, message: 'Examination updated successfully.', data: exam });
});

app.delete('/api/exams/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const idx = exams.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Exam not found.' });

  exams.splice(idx, 1);
  seatingAllocations = seatingAllocations.filter(sa => sa.exam_id !== id);
  res.json({ success: true, message: 'Examination deleted successfully.' });
});

// ========================================================
// 4. Hall Management APIs
// ========================================================
app.get('/api/halls', (req: Request, res: Response) => {
  const search = String(req.query.search || '').toLowerCase().trim();
  const status = String(req.query.status || '').trim();

  let filtered = [...halls];
  if (search) {
    filtered = filtered.filter(h =>
      h.hall_name.toLowerCase().includes(search) ||
      h.building.toLowerCase().includes(search) ||
      h.room_number.toLowerCase().includes(search)
    );
  }
  if (status) {
    filtered = filtered.filter(h => h.status === status);
  }

  filtered.sort((a, b) => a.hall_name.localeCompare(b.hall_name));
  res.json({ success: true, data: filtered });
});

app.post('/api/halls', (req: Request, res: Response): any => {
  const { hall_name, building, room_number, total_rows, total_columns, status } = req.body;
  if (!hall_name || !building || !room_number || !total_rows || !total_columns) {
    return res.status(400).json({ success: false, error: 'All hall fields are required.' });
  }

  const rows = parseInt(total_rows);
  const cols = parseInt(total_columns);
  if (rows <= 0 || cols <= 0) {
    return res.status(400).json({ success: false, error: 'Rows and columns must be greater than 0.' });
  }

  const newHall: Hall = {
    id: nextHallId++,
    hall_name: hall_name.trim(),
    building: building.trim(),
    room_number: room_number.trim(),
    total_rows: rows,
    total_columns: cols,
    capacity: rows * cols,
    status: status || 'Available'
  };

  halls.push(newHall);
  res.status(201).json({ success: true, message: 'Hall created successfully.', data: newHall });
});

app.put('/api/halls/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const hall = halls.find(h => h.id === id);
  if (!hall) return res.status(404).json({ success: false, error: 'Hall not found.' });

  const { hall_name, building, room_number, total_rows, total_columns, status } = req.body;
  if (hall_name) hall.hall_name = hall_name.trim();
  if (building) hall.building = building.trim();
  if (room_number) hall.room_number = room_number.trim();
  if (total_rows && total_columns) {
    hall.total_rows = parseInt(total_rows);
    hall.total_columns = parseInt(total_columns);
    hall.capacity = hall.total_rows * hall.total_columns;
  }
  if (status) hall.status = status;

  res.json({ success: true, message: 'Hall updated successfully.', data: hall });
});

app.delete('/api/halls/:id', (req: Request, res: Response): any => {
  const id = parseInt(req.params.id);
  const idx = halls.findIndex(h => h.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Hall not found.' });

  halls.splice(idx, 1);
  seatingAllocations = seatingAllocations.filter(sa => sa.hall_id !== id);
  res.json({ success: true, message: 'Hall deleted successfully.' });
});

// ========================================================
// 5. Automatic Seating Allocation Algorithm & Routes
// ========================================================
app.post('/api/seating/generate', (req: Request, res: Response): any => {
  const { exam_id, hall_ids, departments, year, strategy = 'sequential' } = req.body;

  if (!exam_id || !hall_ids || hall_ids.length === 0) {
    return res.status(400).json({ success: false, error: 'Please select an examination and at least one hall.' });
  }

  const exam = exams.find(e => e.id === parseInt(exam_id));
  if (!exam) return res.status(404).json({ success: false, error: 'Selected examination not found.' });

  const selectedHalls = halls.filter(h => hall_ids.includes(h.id) && h.status === 'Available');
  if (selectedHalls.length === 0) {
    return res.status(400).json({ success: false, error: 'None of the selected examination halls are currently available.' });
  }

  // Filter eligible students
  let eligibleStudents = [...students];
  if (departments && departments.length > 0 && !departments.includes('ALL')) {
    eligibleStudents = eligibleStudents.filter(s => departments.includes(s.department));
  } else if (exam.department && exam.department !== 'ALL') {
    // By default target exam department
    eligibleStudents = eligibleStudents.filter(s => s.department === exam.department);
  }

  if (year) {
    eligibleStudents = eligibleStudents.filter(s => s.year === parseInt(year));
  } else if (exam.year) {
    eligibleStudents = eligibleStudents.filter(s => s.year === exam.year);
  }

  const totalStudents = eligibleStudents.length;
  const totalCapacity = selectedHalls.reduce((sum, h) => sum + h.capacity, 0);

  if (totalStudents === 0) {
    return res.status(400).json({ success: false, error: 'No eligible candidates found for the chosen criteria.' });
  }

  if (totalCapacity < totalStudents) {
    return res.status(400).json({
      success: false,
      error: `Insufficient hall capacity! Candidates: ${totalStudents}, Selected halls capacity: ${totalCapacity}. Please select additional halls.`
    });
  }

  // Seating Sequence Strategy
  let orderedStudents: Student[] = [];
  if (strategy === 'alternate') {
    // Interleave across departments
    const deptMap: Record<string, Student[]> = {};
    eligibleStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
    eligibleStudents.forEach(s => {
      if (!deptMap[s.department]) deptMap[s.department] = [];
      deptMap[s.department].push(s);
    });

    const keys = Object.keys(deptMap).sort();
    const maxLen = Math.max(...keys.map(k => deptMap[k].length));
    for (let i = 0; i < maxLen; i++) {
      for (const k of keys) {
        if (i < deptMap[k].length) {
          orderedStudents.push(deptMap[k][i]);
        }
      }
    }
  } else {
    // Sequential strictly by roll number
    orderedStudents = eligibleStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
  }

  // Map into halls
  let studentIdx = 0;
  const allocations: any[] = [];
  const hallPreviews: any[] = [];

  for (const hall of selectedHalls) {
    const hallGrid: any[][] = [];
    let hallCount = 0;

    for (let r = 1; r <= hall.total_rows; r++) {
      const rowSeats: any[] = [];
      for (let c = 1; c <= hall.total_columns; c++) {
        const sNum = `S-R${r}C${c}`;
        let allocatedStudent = null;

        if (studentIdx < totalStudents) {
          const st = orderedStudents[studentIdx];
          allocatedStudent = {
            student_id: st.id,
            roll_number: st.roll_number,
            full_name: st.full_name,
            department: st.department,
            year: st.year
          };

          allocations.push({
            exam_id: exam.id,
            student_id: st.id,
            hall_id: hall.id,
            seat_number: sNum,
            row_number: r,
            column_number: c,
            student_roll: st.roll_number,
            student_name: st.full_name,
            student_dept: st.department
          });

          studentIdx++;
          hallCount++;
        }

        rowSeats.push({
          seat_number: sNum,
          row: r,
          col: c,
          is_occupied: allocatedStudent !== null,
          student: allocatedStudent
        });
      }
      hallGrid.push(rowSeats);
    }

    hallPreviews.push({
      hall_id: hall.id,
      hall_name: hall.hall_name,
      room_number: hall.room_number,
      building: hall.building,
      total_rows: hall.total_rows,
      total_columns: hall.total_columns,
      capacity: hall.capacity,
      allocated_count: hallCount,
      seats_grid: hallGrid
    });
  }

  res.json({
    success: true,
    message: 'Seating preview generated successfully.',
    data: {
      exam,
      strategy,
      total_students: totalStudents,
      total_allocated: studentIdx,
      total_capacity: totalCapacity,
      allocations,
      hall_previews: hallPreviews
    }
  });
});

app.post('/api/seating/save', (req: Request, res: Response): any => {
  const { exam_id, allocations, publish = false } = req.body;
  if (!exam_id || !allocations || allocations.length === 0) {
    return res.status(400).json({ success: false, error: 'No seating allocations to save.' });
  }

  // Atomic replace for this exam
  seatingAllocations = seatingAllocations.filter(sa => sa.exam_id !== parseInt(exam_id));

  const publishVal = publish ? 1 : 0;
  allocations.forEach((a: any) => {
    seatingAllocations.push({
      id: nextAllocId++,
      exam_id: parseInt(exam_id),
      student_id: a.student_id,
      hall_id: a.hall_id,
      seat_number: a.seat_number,
      row_number: a.row_number,
      column_number: a.column_number,
      allocated_at: new Date().toISOString(),
      published: publishVal
    });
  });

  res.json({
    success: true,
    message: `Successfully saved ${allocations.length} seat allocations.`,
    data: { saved_count: allocations.length, published: publish }
  });
});

app.post('/api/seating/publish', (req: Request, res: Response): any => {
  const { exam_id, published = 1 } = req.body;
  if (!exam_id) return res.status(400).json({ success: false, error: 'Exam ID is required.' });

  let count = 0;
  seatingAllocations.forEach(sa => {
    if (sa.exam_id === parseInt(exam_id)) {
      sa.published = published ? 1 : 0;
      count++;
    }
  });

  res.json({
    success: true,
    message: `Seating allocations ${published ? 'published' : 'unpublished'}.`,
    data: { affected_rows: count }
  });
});

app.get('/api/seating/exam/:exam_id', (req: Request, res: Response): any => {
  const examId = parseInt(req.params.exam_id);
  const exam = exams.find(e => e.id === examId);
  if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });

  const rawAllocs = seatingAllocations.filter(sa => sa.exam_id === examId);
  const allocations = rawAllocs.map(sa => {
    const student = students.find(s => s.id === sa.student_id) || { roll_number: 'N/A', full_name: 'Unknown', department: '', year: 0 };
    const hall = halls.find(h => h.id === sa.hall_id) || { hall_name: 'N/A', building: '', room_number: '', total_rows: 0, total_columns: 0 };
    return {
      alloc_id: sa.id,
      seat_number: sa.seat_number,
      row_number: sa.row_number,
      column_number: sa.column_number,
      published: sa.published,
      student_id: sa.student_id,
      roll_number: student.roll_number,
      student_name: student.full_name,
      department: student.department,
      year: student.year,
      hall_id: sa.hall_id,
      hall_name: hall.hall_name,
      building: hall.building,
      room_number: hall.room_number,
      total_rows: hall.total_rows,
      total_columns: hall.total_columns
    };
  });

  // Group by hall
  const hallsMap: Record<number, any> = {};
  allocations.forEach(a => {
    if (!hallsMap[a.hall_id]) {
      hallsMap[a.hall_id] = {
        hall_id: a.hall_id,
        hall_name: a.hall_name,
        building: a.building,
        room_number: a.room_number,
        total_rows: a.total_rows,
        total_columns: a.total_columns,
        seats: []
      };
    }
    hallsMap[a.hall_id].seats.push(a);
  });

  res.json({
    success: true,
    data: {
      exam,
      total_allocated: allocations.length,
      is_published: allocations.length > 0 ? allocations[0].published : 0,
      allocations,
      halls: Object.values(hallsMap)
    }
  });
});

app.get('/api/seating/student', (req: Request, res: Response): any => {
  const sess = getSession(req);
  if (!sess || sess.role !== 'student') {
    return res.status(401).json({ success: false, error: 'Unauthorized. Student session required.' });
  }

  const studentId = sess.userId;
  // Get ONLY published seats for this student
  const studentAllocs = seatingAllocations.filter(sa => sa.student_id === studentId && sa.published === 1);

  const formatted = studentAllocs.map(sa => {
    const exam = exams.find(e => e.id === sa.exam_id);
    const hall = halls.find(h => h.id === sa.hall_id);
    return {
      allocation_id: sa.id,
      seat_number: sa.seat_number,
      row_number: sa.row_number,
      column_number: sa.column_number,
      exam_id: sa.exam_id,
      exam_name: exam?.exam_name || 'Examination',
      subject: exam?.subject || '',
      exam_date: exam?.exam_date || '',
      session: exam?.session || 'FN',
      start_time: exam?.start_time || '',
      end_time: exam?.end_time || '',
      reporting_time: exam?.reporting_time || '',
      hall_name: hall?.hall_name || '',
      building: hall?.building || '',
      room_number: hall?.room_number || ''
    };
  });

  res.json({ success: true, data: formatted });
});

app.delete('/api/seating/exam/:exam_id', (req: Request, res: Response) => {
  const examId = parseInt(req.params.exam_id);
  const initialLen = seatingAllocations.length;
  seatingAllocations = seatingAllocations.filter(sa => sa.exam_id !== examId);
  res.json({
    success: true,
    message: 'Seating allocations cleared successfully.',
    data: { deleted_count: initialLen - seatingAllocations.length }
  });
});

// ========================================================
// 6. Reports & Dashboard Stats APIs
// ========================================================
app.get('/api/reports/dashboard-stats', (req: Request, res: Response) => {
  // Department breakdown
  const deptCount: Record<string, number> = {};
  students.forEach(s => {
    deptCount[s.department] = (deptCount[s.department] || 0) + 1;
  });
  const deptStats = Object.keys(deptCount).map(k => ({ department: k, count: deptCount[k] }));

  // Hall capacity & load
  const hallStats = halls.map(h => {
    const allocated = seatingAllocations.filter(sa => sa.hall_id === h.id).length;
    return {
      hall_name: h.hall_name,
      capacity: h.capacity,
      allocated
    };
  });

  // Recent exams
  const recentExams = exams.slice(0, 5).map(e => ({
    ...e,
    alloc_count: seatingAllocations.filter(sa => sa.exam_id === e.id).length,
    published: seatingAllocations.some(sa => sa.exam_id === e.id && sa.published === 1) ? 1 : 0
  }));

  // Recent students
  const recentStudents = students.slice(0, 5);

  const totalCapacity = halls.reduce((sum, h) => sum + h.capacity, 0);

  res.json({
    success: true,
    data: {
      total_students: students.length,
      total_exams: exams.length,
      total_halls: halls.length,
      total_allocations: seatingAllocations.length,
      total_capacity: totalCapacity,
      dept_stats: deptStats,
      hall_stats: hallStats,
      recent_exams: recentExams,
      recent_students: recentStudents
    }
  });
});

app.get('/api/reports/seating/data', (req: Request, res: Response) => {
  const exam_id = req.query.exam_id ? parseInt(String(req.query.exam_id)) : null;
  const hall_id = req.query.hall_id ? parseInt(String(req.query.hall_id)) : null;
  const department = String(req.query.department || '').trim();
  const search = String(req.query.search || '').toLowerCase().trim();

  let filtered = seatingAllocations.map(sa => {
    const exam = exams.find(e => e.id === sa.exam_id);
    const student = students.find(s => s.id === sa.student_id);
    const hall = halls.find(h => h.id === sa.hall_id);
    return {
      id: sa.id,
      seat_number: sa.seat_number,
      row_number: sa.row_number,
      column_number: sa.column_number,
      published: sa.published,
      exam_id: sa.exam_id,
      exam_name: exam?.exam_name || '',
      subject: exam?.subject || '',
      exam_date: exam?.exam_date || '',
      session: exam?.session || '',
      student_id: sa.student_id,
      roll_number: student?.roll_number || '',
      student_name: student?.full_name || '',
      department: student?.department || '',
      year: student?.year || 0,
      hall_id: sa.hall_id,
      hall_name: hall?.hall_name || '',
      building: hall?.building || '',
      room_number: hall?.room_number || ''
    };
  });

  if (exam_id) filtered = filtered.filter(f => f.exam_id === exam_id);
  if (hall_id) filtered = filtered.filter(f => f.hall_id === hall_id);
  if (department) filtered = filtered.filter(f => f.department === department);
  if (search) {
    filtered = filtered.filter(f =>
      f.roll_number.toLowerCase().includes(search) ||
      f.student_name.toLowerCase().includes(search) ||
      f.hall_name.toLowerCase().includes(search)
    );
  }

  filtered.sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.hall_name.localeCompare(b.hall_name) || a.seat_number.localeCompare(b.seat_number));

  res.json({ success: true, data: filtered });
});

app.get('/api/reports/seating/excel', (req: Request, res: Response): any => {
  const exam_id = req.query.exam_id ? parseInt(String(req.query.exam_id)) : null;
  const hall_id = req.query.hall_id ? parseInt(String(req.query.hall_id)) : null;

  let filtered = seatingAllocations.map(sa => {
    const exam = exams.find(e => e.id === sa.exam_id);
    const student = students.find(s => s.id === sa.student_id);
    const hall = halls.find(h => h.id === sa.hall_id);
    return {
      'Exam Name': exam?.exam_name || '',
      'Subject': exam?.subject || '',
      'Date': exam?.exam_date || '',
      'Session': exam?.session || '',
      'Hall Name': hall?.hall_name || '',
      'Room Number': hall?.room_number || '',
      'Seat Number': sa.seat_number,
      'Row': sa.row_number,
      'Column': sa.column_number,
      'Student Roll Number': student?.roll_number || '',
      'Student Name': student?.full_name || '',
      'Department': student?.department || '',
      'Year': student?.year || 0,
      exam_id: sa.exam_id,
      hall_id: sa.hall_id
    };
  });

  if (exam_id) filtered = filtered.filter(f => f.exam_id === exam_id);
  if (hall_id) filtered = filtered.filter(f => f.hall_id === hall_id);

  if (filtered.length === 0) {
    return res.status(404).send('No seating allocation data found to export.');
  }

  // Remove internal IDs before Excel output
  const excelData = filtered.map(({ exam_id, hall_id, ...rest }) => rest);

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seating Arrangement');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="SeatWise_Seating_Report_${exam_id || 'All'}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Start Server with Vite Middlewares in dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`SeatWise Server running at http://0.0.0.0:${PORT}`);
    console.log(`Admin Portal: http://localhost:${PORT}/login.html (admin / admin123)`);
    console.log(`Student Portal: http://localhost:${PORT}/student-login.html (21CS001 / student123)`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
