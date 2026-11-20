-- =======================================================
-- SeatWise – Exam Seating Arrangement System
-- MySQL Relational Database Schema
-- =======================================================

CREATE DATABASE IF NOT EXISTS seatwise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seatwise_db;

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS seating_allocations;
DROP TABLE IF EXISTS halls;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS admins;

-- -------------------------------------------------------
-- 1. Admins Table
-- -------------------------------------------------------
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 2. Students Table
-- -------------------------------------------------------
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_number VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dept_year (department, year),
    INDEX idx_roll (roll_number)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 3. Exams Table
-- -------------------------------------------------------
CREATE TABLE exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_name VARCHAR(150) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    exam_date DATE NOT NULL,
    session ENUM('FN', 'AN') NOT NULL DEFAULT 'FN',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reporting_time TIME NOT NULL,
    status ENUM('Scheduled', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exam_date (exam_date, session)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 4. Examination Halls Table
-- -------------------------------------------------------
CREATE TABLE halls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hall_name VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    total_rows INT NOT NULL CHECK (total_rows > 0),
    total_columns INT NOT NULL CHECK (total_columns > 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    status ENUM('Available', 'Maintenance', 'Occupied') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hall_room (building, room_number)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 5. Seating Allocations Table
-- -------------------------------------------------------
CREATE TABLE seating_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    hall_id INT NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    `row_number` INT NOT NULL,
    column_number INT NOT NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published TINYINT(1) DEFAULT 0,
    -- Constraints to prevent double booking
    CONSTRAINT fk_alloc_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_hall FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    -- Student can only have 1 seat per exam
    CONSTRAINT uq_student_exam UNIQUE (exam_id, student_id),
    -- Seat in hall can only be occupied once per exam
    CONSTRAINT uq_seat_hall_exam UNIQUE (exam_id, hall_id, seat_number),
    INDEX idx_exam_hall (exam_id, hall_id)
) ENGINE=InnoDB;

-- =======================================================
-- Seed Initial Sample Data for Demonstration & Testing
-- Passwords:
-- Admin: "admin123" -> hashed via werkzeug.security
-- Student: "student123" -> hashed via werkzeug.security
-- (Werkzeug scrypt hash format)
-- =======================================================

INSERT INTO admins (username, password_hash, full_name, email) VALUES
('admin', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8', 'Prof. Alexander Wright', 'admin@seatwise.edu');

-- Seed Students
INSERT INTO students (roll_number, full_name, department, year, email, phone, password_hash) VALUES
('21CS001', 'Aarav Sharma', 'CSE', 3, 'aarav.sharma@seatwise.edu', '+91 9876543210', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21CS002', 'Bhavna Patel', 'CSE', 3, 'bhavna.patel@seatwise.edu', '+91 9876543211', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21CS003', 'Chirag Reddy', 'CSE', 3, 'chirag.reddy@seatwise.edu', '+91 9876543212', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21CS004', 'Divya Iyer', 'CSE', 3, 'divya.iyer@seatwise.edu', '+91 9876543213', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21CS005', 'Eshwar Nair', 'CSE', 3, 'eshwar.nair@seatwise.edu', '+91 9876543214', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21IT001', 'Farhan Ali', 'IT', 3, 'farhan.ali@seatwise.edu', '+91 9876543215', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21IT002', 'Geeta Menon', 'IT', 3, 'geeta.menon@seatwise.edu', '+91 9876543216', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21IT003', 'Harish Verma', 'IT', 3, 'harish.verma@seatwise.edu', '+91 9876543217', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21ECE01', 'Ishaan Gupta', 'ECE', 3, 'ishaan.gupta@seatwise.edu', '+91 9876543218', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21ECE02', 'Jaya Singh', 'ECE', 3, 'jaya.singh@seatwise.edu', '+91 9876543219', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21ECE03', 'Karan Mehra', 'ECE', 3, 'karan.mehra@seatwise.edu', '+91 9876543220', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8'),
('21ME001', 'Lakshmi Sen', 'MECH', 3, 'lakshmi.sen@seatwise.edu', '+91 9876543221', 'scrypt:32768:8:1$kE6VfZU8Lh4Vz1yQ$5fae6a605f6390a36e1c070c79eb2997b7cb7a61d15d6cbb17bdf721245fa8a00ec1e1dc4a6825cbbdaefb3190df03530c00ef6d302bc6572eb967a57a12b4e8');

-- Seed Halls
INSERT INTO halls (hall_name, building, room_number, total_rows, total_columns, capacity, status) VALUES
('Ramanujan Hall', 'Science & Tech Block', 'LH-101', 5, 4, 20, 'Available'),
('Turing Hall', 'Computing Block', 'LH-204', 6, 4, 24, 'Available'),
('Aryabhata Hall', 'Academic Block A', 'LH-305', 4, 4, 16, 'Available'),
('Babbage Hall', 'Computing Block', 'LH-201', 5, 5, 25, 'Available');

-- Seed Exams
INSERT INTO exams (exam_name, subject, department, year, exam_date, session, start_time, end_time, reporting_time, status) VALUES
('B.Tech End Sem Exam - Nov 2026', 'Design and Analysis of Algorithms (CS301)', 'CSE', 3, '2026-11-20', 'FN', '09:30:00', '12:30:00', '09:00:00', 'Scheduled'),
('B.Tech End Sem Exam - Nov 2026', 'Database Management Systems (IT302)', 'IT', 3, '2026-11-20', 'FN', '09:30:00', '12:30:00', '09:00:00', 'Scheduled'),
('B.Tech End Sem Exam - Nov 2026', 'Digital Signal Processing (EC303)', 'ECE', 3, '2026-11-22', 'AN', '14:00:00', '17:00:00', '13:30:00', 'Scheduled'),
('B.Tech Mid Sem Exam - Dec 2026', 'Compiler Design (CS304)', 'CSE', 3, '2026-12-05', 'FN', '10:00:00', '12:00:00', '09:30:00', 'Scheduled');
