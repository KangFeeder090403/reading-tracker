CREATE DATABASE IF NOT EXISTS reading_tracker;
USE reading_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  google_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  authors VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(32) DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample user (password: password) -> store precomputed bcrypt hash for 'password'
INSERT INTO users (name, email, password_hash)
VALUES ('Demo User', 'demo@example.com', '$2a$10$9mH8IYz0yX5pQ8FQf1i1LeU5oAtLqQvJ2z1m6o06o1Yb1k3H1YV4e')
ON DUPLICATE KEY UPDATE name=VALUES(name);

SET @uid = (SELECT id FROM users WHERE email='demo@example.com');

INSERT INTO books (user_id, title, authors, status, notes) VALUES
(@uid, 'Dracula', 'Bram Stoker', 'completed', 'Selesai dibaca tahun lalu.'),
(@uid, 'The Name of the Rose', 'Umberto Eco', 'reading', 'Bab 3, atmosfer biara sangat kental.'),
(@uid, 'Blood of Elves', 'Andrzej Sapkowski', 'planned', 'Masuk antrian berikutnya.');
