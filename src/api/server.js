import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import axios from 'axios'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
}
const dbName = process.env.DB_NAME || 'reading_tracker'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_me_secret'
let pool

async function ensureDatabase() {
  const conn = await mysql.createConnection(dbConfig)
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.end()
}

async function ensureTables() {
  // users
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  // Add missing columns for older installs
  try { await pool.execute('ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL') } catch {}

  // If legacy `username` column exists, migrate and remove it
  try {
    // Copy username -> name where name empty
    await pool.execute("UPDATE users SET name = COALESCE(NULLIF(name, ''), NULLIF(username, '')) WHERE (name IS NULL OR name='')")
  } catch {}
  try { await pool.execute('ALTER TABLE users DROP INDEX username') } catch {}
  try { await pool.execute('ALTER TABLE users DROP INDEX users_username_unique') } catch {}
  try { await pool.execute('ALTER TABLE users MODIFY COLUMN username VARCHAR(100) NULL') } catch {}
  try { await pool.execute('ALTER TABLE users DROP COLUMN username') } catch {}

  // books
  await pool.execute(`
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
      current_page INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // For older tables, try to add user_id if missing (ignore error if exists)
  try { await pool.execute('ALTER TABLE books ADD COLUMN user_id INT NULL') } catch {}
  try { await pool.execute('CREATE INDEX idx_user_id ON books(user_id)') } catch {}
  // Ensure legacy columns exist
  try { await pool.execute('ALTER TABLE books ADD COLUMN start_date DATE NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN end_date DATE NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN current_page INT DEFAULT 0') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN rating TINYINT NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN review TEXT NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN total_pages INT NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN shelf VARCHAR(50) NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN tags TEXT NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN series VARCHAR(120) NULL') } catch {}
  try { await pool.execute('ALTER TABLE books ADD COLUMN series_index INT NULL') } catch {}

  // Categories table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cat_user (user_id),
      CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Pivot: book_categories (many-to-many)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS book_categories (
      book_id INT NOT NULL,
      category_id INT NOT NULL,
      PRIMARY KEY (book_id, category_id),
      CONSTRAINT fk_bc_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      CONSTRAINT fk_bc_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Reading challenges
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reading_challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_books INT DEFAULT 0,
      target_pages INT DEFAULT 0,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chal_user (user_id),
      CONSTRAINT fk_chal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // New: reading_sessions
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      start_ts DATETIME NOT NULL,
      end_ts DATETIME NULL,
      duration_sec INT NULL,
      INDEX idx_rs_user (user_id),
      INDEX idx_rs_book (book_id),
      CONSTRAINT fk_rs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_rs_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Highlights table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS highlights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      page INT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_h_user (user_id),
      INDEX idx_h_book (book_id),
      CONSTRAINT fk_h_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_h_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

async function init() {
  await ensureDatabase()
  pool = await mysql.createPool({ ...dbConfig, database: dbName, connectionLimit: 10 })
  await ensureTables()
}

await init().catch(err => {
  console.error('DB init failed:', err)
  process.exit(1)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

function signToken(user) {
  return jwt.sign({ uid: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const uid = payload.uid ?? payload.id // support legacy tokens
    if (!uid) return res.status(401).json({ error: 'invalid_token' })
    req.user = { id: uid, name: payload.name, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

function log500(res, label, e) {
  console.error(label, e)
  res.status(500).json({ error: label, message: e?.message, code: e?.code })
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'missing_fields' })
    const [exist] = await pool.query('SELECT id FROM users WHERE email=? LIMIT 1', [email])
    if (exist.length) return res.status(409).json({ error: 'email_exists' })
    const password_hash = bcrypt.hashSync(password, 10)
    const [r] = await pool.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, password_hash])
    const user = { id: r.insertId, name, email }

    // Seed a few demo books for this new user
    await pool.execute(
      'INSERT INTO books (user_id, title, authors, status, notes) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
      [
        user.id, 'Dracula', 'Bram Stoker', 'completed', 'Selesai dibaca tahun lalu.',
        user.id, 'The Name of the Rose', 'Umberto Eco', 'reading', 'Bab 3, atmosfer biara sangat kental.',
        user.id, 'Blood of Elves', 'Andrzej Sapkowski', 'planned', 'Masuk antrian berikutnya.'
      ]
    )

    const token = signToken(user)
    res.json({ token, user })
  } catch (e) {
    return log500(res, 'register_failed', e)
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? LIMIT 1', [email])
    if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' })
    const userRow = rows[0]
    const ok = bcrypt.compareSync(password, userRow.password_hash)
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
    const user = { id: userRow.id, name: userRow.name, email: userRow.email }
    const token = signToken(user)
    res.json({ token, user })
  } catch (e) {
    return log500(res, 'login_failed', e)
  }
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: req.user })
})

// Google Books passthrough (optional, public)
app.get('/api/google/search', async (req, res) => {
  try {
    const q = req.query.q
    if (!q) return res.json({ items: [] })
    const { data } = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: { q, maxResults: 10 }
    })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'google_books_failed' })
  }
})

// CRUD Books (protected)
app.get('/api/books', authRequired, async (req, res) => {
  try {
    const { category_id } = req.query
    if (category_id) {
      const [rows] = await pool.query(
        'SELECT b.* FROM books b JOIN book_categories bc ON bc.book_id=b.id WHERE b.user_id=? AND bc.category_id=? ORDER BY b.created_at DESC',
        [req.user.id, category_id]
      )
      return res.json(rows)
    }
    const [rows] = await pool.query('SELECT * FROM books WHERE user_id=? ORDER BY created_at DESC', [req.user.id])
    res.json(rows)
  } catch (e) { return log500(res, 'list_failed', e) }
})

app.get('/api/books/:id', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const [rows] = await pool.query('SELECT * FROM books WHERE id=? AND user_id=?', [bookId, req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    res.json(rows[0])
  } catch (e) { return log500(res, 'get_failed', e) }
})

app.post('/api/books', authRequired, async (req, res) => {
  try {
    const { google_id, title, authors, start_date, end_date, status, notes, current_page, rating, review, shelf, tags, series, series_index } = req.body
    if (!title) return res.status(400).json({ error: 'title_required' })
    const [result] = await pool.execute(
      'INSERT INTO books (user_id, google_id, title, authors, start_date, end_date, status, notes, current_page, rating, review, shelf, tags, series, series_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        google_id || null,
        title,
        authors || null,
        start_date || null,
        end_date || null,
        status || 'planned',
        notes || null,
        Number(current_page) || 0,
        (rating ?? null),
        (review ?? null),
        (shelf ?? null),
        (tags ?? null),
        (series ?? null),
        (series_index ?? null)
      ]
    )
    res.json({ id: result.insertId })
  } catch (e) { return log500(res, 'create_failed', e) }
})

app.put('/api/books/:id', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const { title, authors, start_date, end_date, status, notes, rating, review, shelf, tags, series, series_index } = req.body
    let { current_page } = req.body
    if (current_page !== undefined) {
      const n = Number(current_page)
      current_page = Number.isFinite(n) ? n : 0
    } else {
      current_page = null
    }
    const [result] = await pool.execute(
      'UPDATE books SET title=COALESCE(?, title), authors=COALESCE(?, authors), start_date=?, end_date=?, status=COALESCE(?, status), notes=?, current_page=COALESCE(?, current_page), rating=COALESCE(?, rating), review=COALESCE(?, review), shelf=COALESCE(?, shelf), tags=COALESCE(?, tags), series=COALESCE(?, series), series_index=COALESCE(?, series_index) WHERE id=? AND user_id=?',
      [
        (title ?? null), (authors ?? null), (start_date || null), (end_date || null), (status ?? null), (notes ?? null),
        current_page, (rating ?? null), (review ?? null), (shelf ?? null), (tags ?? null), (series ?? null), (series_index ?? null),
        bookId, req.user.id
      ]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (e) { return log500(res, 'update_failed', e) }
})

app.delete('/api/books/:id', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const [result] = await pool.execute('DELETE FROM books WHERE id=? AND user_id=?', [bookId, req.user.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (e) { return log500(res, 'delete_failed', e) }
})

// Categories CRUD (protected)
app.get('/api/categories', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE user_id=? ORDER BY name', [req.user.id])
    res.json(rows)
  } catch (e) { return log500(res, 'categories_list_failed', e) }
})

app.post('/api/categories', authRequired, async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name_required' })
    const [r] = await pool.execute('INSERT INTO categories (user_id, name) VALUES (?, ?)', [req.user.id, name])
    res.json({ id: r.insertId })
  } catch (e) { return log500(res, 'categories_create_failed', e) }
})

app.delete('/api/categories/:id', authRequired, async (req, res) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id=? AND user_id=?', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (e) { return log500(res, 'categories_delete_failed', e) }
})

// Book categories mapping
app.get('/api/books/:id/categories', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.id, c.name FROM book_categories bc JOIN categories c ON c.id=bc.category_id WHERE bc.book_id=? AND c.user_id=?',
      [req.params.id, req.user.id]
    )
    res.json(rows)
  } catch (e) { return log500(res, 'book_categories_get_failed', e) }
})

app.put('/api/books/:id/categories', authRequired, async (req, res) => {
  try {
    const { categoryIds } = req.body
    if (!Array.isArray(categoryIds)) return res.status(400).json({ error: 'categoryIds_array_required' })
    await pool.execute('DELETE bc FROM book_categories bc JOIN categories c ON c.id=bc.category_id WHERE bc.book_id=? AND c.user_id=?', [req.params.id, req.user.id])
    if (categoryIds.length) {
      const values = categoryIds.map(id => `(${mysql.escape(req.params.id)}, ${mysql.escape(id)})`).join(',')
      await pool.query('INSERT INTO book_categories (book_id, category_id) VALUES ' + values)
    }
    res.json({ ok: true })
  } catch (e) { return log500(res, 'book_categories_set_failed', e) }
})

// Challenges
app.get('/api/challenges', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reading_challenges WHERE user_id=? ORDER BY start_date DESC', [req.user.id])
    res.json(rows)
  } catch (e) { return log500(res, 'challenges_list_failed', e) }
})

app.post('/api/challenges', authRequired, async (req, res) => {
  try {
    const { target_books = 0, target_pages = 0, start_date, end_date } = req.body
    if (!start_date || !end_date) return res.status(400).json({ error: 'date_required' })
    const [r] = await pool.execute(
      'INSERT INTO reading_challenges (user_id, target_books, target_pages, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, target_books, target_pages, start_date, end_date]
    )
    res.json({ id: r.insertId })
  } catch (e) { return log500(res, 'challenges_create_failed', e) }
})

// Top categories by usage for recommendations
app.get('/api/categories/top', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.id, c.name, COUNT(bc.book_id) AS cnt FROM categories c LEFT JOIN book_categories bc ON bc.category_id=c.id WHERE c.user_id=? GROUP BY c.id, c.name ORDER BY cnt DESC, c.name ASC LIMIT 5',
      [req.user.id]
    )
    res.json(rows)
  } catch (e) { return log500(res, 'categories_top_failed', e) }
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log('API running on http://localhost:' + port))

// Reading sessions endpoints
app.get('/api/books/:id/sessions', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const [rows] = await pool.query('SELECT id, start_ts, end_ts, duration_sec FROM reading_sessions WHERE user_id=? AND book_id=? ORDER BY start_ts DESC LIMIT 50', [req.user.id, bookId])
    res.json(rows)
  } catch (e) { return log500(res, 'sessions_list_failed', e) }
})

app.post('/api/books/:id/sessions/start', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    // Optional: close any dangling session
    await pool.execute('UPDATE reading_sessions SET end_ts=NOW(), duration_sec=TIMESTAMPDIFF(SECOND, start_ts, NOW()) WHERE user_id=? AND book_id=? AND end_ts IS NULL', [req.user.id, bookId])
    const [r] = await pool.execute('INSERT INTO reading_sessions (user_id, book_id, start_ts) VALUES (?, ?, NOW())', [req.user.id, bookId])
    res.json({ id: r.insertId })
  } catch (e) { return log500(res, 'sessions_start_failed', e) }
})

app.post('/api/books/:id/sessions/stop', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const [r] = await pool.execute('UPDATE reading_sessions SET end_ts=NOW(), duration_sec=TIMESTAMPDIFF(SECOND, start_ts, NOW()) WHERE user_id=? AND book_id=? AND end_ts IS NULL ORDER BY start_ts DESC LIMIT 1', [req.user.id, bookId])
    if (r.affectedRows === 0) return res.status(400).json({ error: 'no_active_session' })
    res.json({ ok: true })
  } catch (e) { return log500(res, 'sessions_stop_failed', e) }
})

// Highlights endpoints
app.get('/api/books/:id/highlights', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const [rows] = await pool.query('SELECT id, page, text, created_at FROM highlights WHERE user_id=? AND book_id=? ORDER BY created_at DESC', [req.user.id, bookId])
    res.json(rows)
  } catch (e) { return log500(res, 'highlights_list_failed', e) }
})

app.post('/api/books/:id/highlights', authRequired, async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: 'bad_id' })
    const { text, page } = req.body
    if (!text) return res.status(400).json({ error: 'text_required' })
    const [r] = await pool.execute('INSERT INTO highlights (user_id, book_id, page, text) VALUES (?, ?, ?, ?)', [req.user.id, bookId, (page ?? null), text])
    res.json({ id: r.insertId })
  } catch (e) { return log500(res, 'highlights_create_failed', e) }
})

app.delete('/api/highlights/:hid', authRequired, async (req, res) => {
  try {
    const hid = Number(req.params.hid)
    if (!Number.isInteger(hid) || hid <= 0) return res.status(400).json({ error: 'bad_id' })
    const [r] = await pool.execute('DELETE FROM highlights WHERE id=? AND user_id=?', [hid, req.user.id])
    if (r.affectedRows === 0) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (e) { return log500(res, 'highlights_delete_failed', e) }
})

// Export user data (JSON)
app.get('/api/export', authRequired, async (req, res) => {
  try {
    const uid = req.user.id
    const [books] = await pool.query('SELECT * FROM books WHERE user_id=? ORDER BY created_at DESC', [uid])
    const [cats] = await pool.query('SELECT * FROM categories WHERE user_id=? ORDER BY name', [uid])
    const [bc] = await pool.query('SELECT bc.book_id, bc.category_id FROM book_categories bc JOIN books b ON b.id=bc.book_id WHERE b.user_id=?', [uid])
    const [chals] = await pool.query('SELECT * FROM reading_challenges WHERE user_id=? ORDER BY start_date DESC', [uid])
    const [sess] = await pool.query('SELECT rs.* FROM reading_sessions rs WHERE rs.user_id=? ORDER BY start_ts DESC', [uid])
    const [high] = await pool.query('SELECT h.* FROM highlights h WHERE h.user_id=? ORDER BY created_at DESC', [uid])
    res.setHeader('Content-Type', 'application/json')
    res.json({ exportedAt: new Date().toISOString(), books, categories: cats, book_categories: bc, challenges: chals, sessions: sess, highlights: high })
  } catch (e) { return log500(res, 'export_failed', e) }
})

// Sessions summary for streaks and totals
app.get('/api/sessions/summary', authRequired, async (req, res) => {
  try {
    const uid = req.user.id
    const [tot] = await pool.query('SELECT COUNT(*) AS cnt, COALESCE(SUM(duration_sec),0) AS dur FROM reading_sessions WHERE user_id=?', [uid])
    const [daysRows] = await pool.query('SELECT DATE(start_ts) AS d FROM reading_sessions WHERE user_id=? GROUP BY DATE(start_ts) ORDER BY d ASC', [uid])
    const days = daysRows.map(r => r.d)
    // compute current streak and longest streak
    const toKey = (d) => new Date(d).toISOString().slice(0,10)
    const set = new Set(days.map(toKey))
    let currentStreak = 0
    let longestStreak = 0
    // walk backwards from today
    let cursor = new Date(); cursor.setHours(0,0,0,0)
    while (set.has(toKey(cursor))) { currentStreak++; cursor.setDate(cursor.getDate()-1) }
    // longest: iterate days array
    let streak = 0, prev = null
    for (const d of days) {
      const dt = new Date(d); dt.setHours(0,0,0,0)
      if (prev) {
        const diff = (dt - prev) / 86400000
        if (diff === 1) streak++
        else streak = 1
      } else streak = 1
      if (streak > longestStreak) longestStreak = streak
      prev = dt
    }
    res.json({ sessions: tot[0].cnt, totalDurationSec: tot[0].dur, currentStreak, longestStreak })
  } catch (e) { return log500(res, 'sessions_summary_failed', e) }
})

// Import user data (JSON)
app.post('/api/import', authRequired, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const payload = req.body || {}
    await conn.beginTransaction()
    const uid = req.user.id
    // Wipe user data (order matters due FK)
    await conn.execute('DELETE FROM highlights WHERE user_id=?', [uid])
    await conn.execute('DELETE rs FROM reading_sessions rs WHERE rs.user_id=?', [uid])
    await conn.execute('DELETE bc FROM book_categories bc JOIN books b ON b.id=bc.book_id WHERE b.user_id=?', [uid])
    await conn.execute('DELETE FROM categories WHERE user_id=?', [uid])
    await conn.execute('DELETE FROM reading_challenges WHERE user_id=?', [uid])
    await conn.execute('DELETE FROM books WHERE user_id=?', [uid])

    // Insert books
    if (Array.isArray(payload.books)) {
      for (const b of payload.books) {
        await conn.execute(
          'INSERT INTO books (id, user_id, google_id, title, authors, start_date, end_date, status, notes, current_page, rating, review, shelf, tags, series, series_index, created_at, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [b.id || null, uid, b.google_id || null, b.title, b.authors || null, b.start_date || null, b.end_date || null, b.status || 'planned', b.notes || null, b.current_page || 0, b.rating ?? null, b.review ?? null, b.shelf ?? null, b.tags ?? null, b.series ?? null, b.series_index ?? null, b.created_at || new Date(), b.total_pages ?? null]
        ).catch(async e => {
          // If id conflict, insert without id
          await conn.execute(
            'INSERT INTO books (user_id, google_id, title, authors, start_date, end_date, status, notes, current_page, rating, review, shelf, tags, series, series_index, created_at, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [uid, b.google_id || null, b.title, b.authors || null, b.start_date || null, b.end_date || null, b.status || 'planned', b.notes || null, b.current_page || 0, b.rating ?? null, b.review ?? null, b.shelf ?? null, b.tags ?? null, b.series ?? null, b.series_index ?? null, b.created_at || new Date(), b.total_pages ?? null]
          )
        })
      }
    }

    // Categories
    const catIdMap = new Map()
    if (Array.isArray(payload.categories)) {
      for (const c of payload.categories) {
        const [r] = await conn.execute('INSERT INTO categories (user_id, name, created_at) VALUES (?, ?, ?)', [uid, c.name, c.created_at || new Date()])
        catIdMap.set(c.id, r.insertId)
      }
    }

    // Book categories
    if (Array.isArray(payload.book_categories)) {
      for (const bc of payload.book_categories) {
        const bid = bc.book_id
        const cid = catIdMap.get(bc.category_id) || bc.category_id
        await conn.execute('INSERT IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)', [bid, cid])
      }
    }

    // Challenges
    if (Array.isArray(payload.challenges)) {
      for (const ch of payload.challenges) {
        await conn.execute('INSERT INTO reading_challenges (user_id, target_books, target_pages, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uid, ch.target_books||0, ch.target_pages||0, ch.start_date, ch.end_date, ch.created_at || new Date()])
      }
    }

    // Sessions
    if (Array.isArray(payload.sessions)) {
      for (const s of payload.sessions) {
        await conn.execute('INSERT INTO reading_sessions (user_id, book_id, start_ts, end_ts, duration_sec) VALUES (?, ?, ?, ?, ?)', [uid, s.book_id, s.start_ts, s.end_ts || null, s.duration_sec || null])
      }
    }

    // Highlights
    if (Array.isArray(payload.highlights)) {
      for (const h of payload.highlights) {
        await conn.execute('INSERT INTO highlights (user_id, book_id, page, text, created_at) VALUES (?, ?, ?, ?, ?)', [uid, h.book_id, h.page || null, h.text, h.created_at || new Date()])
      }
    }

    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    try { await conn.rollback() } catch {}
    return log500(res, 'import_failed', e)
  } finally {
    conn.release()
  }
})
