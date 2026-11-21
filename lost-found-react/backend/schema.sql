CREATE DATABASE IF NOT EXISTS lost_found_db;
USE lost_found_db;

CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  type ENUM('Lost','Found') NOT NULL,
  category VARCHAR(100) NOT NULL,
  color VARCHAR(80) NOT NULL DEFAULT '',
  location VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  status ENUM('Open','Claimed','Returned') NOT NULL DEFAULT 'Open',
  description TEXT,
  reporter VARCHAR(120) NOT NULL
) AUTO_INCREMENT=1001;

CREATE TABLE IF NOT EXISTS claims (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT NOT NULL,
  claimant VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  CONSTRAINT fk_claim_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) AUTO_INCREMENT=501;

INSERT INTO items (name,type,category,color,location,date,status,description,reporter) VALUES
('Black leather wallet','Found','Personal items','Black','Central Library','2026-10-24','Open','Found near the reading area on the first floor.','Aarav Sharma'),
('Blue water bottle','Lost','Accessories','Blue','Cafeteria','2026-10-23','Open','Reusable bottle with a small sticker on the side.','Meera Singh'),
('Scientific calculator','Lost','Electronics','Grey','Block B, Room 204','2026-10-22','Claimed','Grey calculator left after a lecture.','Rohan Verma'),
('Wireless earbuds case','Found','Electronics','White','Sports Ground','2026-10-21','Returned','White charging case found beside the benches.','Ishita Rao'),
('Student ID card','Found','Documents','Blue','Main Entrance','2026-10-20','Open','ID card found close to the entrance gate.','Kabir Das'),
('USB flash drive','Lost','Electronics','Black','Computer Lab','2026-10-19','Open','Small black 32 GB USB drive.','Ananya Patel');
INSERT INTO claims (item_id,claimant,date,status) VALUES (1003,'Rohan Verma','2026-10-23','Pending'),(1004,'Ishita Rao','2026-10-22','Approved');

-- Existing databases: run this file's users table statement separately if items already exist.
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Student','Admin') NOT NULL DEFAULT 'Student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
