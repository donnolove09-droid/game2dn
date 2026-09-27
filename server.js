// server.js — Đảo Trojan: backend Express + PostgreSQL (driver "pg" — thuần JS, không cần biên
// dịch native nên không còn gặp lỗi "gyp ERR!" từng xảy ra với better-sqlite3 trên Render.
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dao-trojan-super-secret-change-me';

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠️  Chưa thấy biến môi trường DATABASE_URL. Hãy tạo 1 Render PostgreSQL (hoặc bất kỳ Postgres nào) ' +
    'rồi đặt DATABASE_URL trỏ tới nó. Server vẫn sẽ cố kết nối tới postgres://localhost để chạy thử local.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

const GENDERS = ['nam', 'nu'];
const ELEMENTS = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
// Vòng tương khắc Ngũ Hành: khoá "khắc" giá trị (bên tấn công có khoá này gây thêm sát thương lên bên có hệ là giá trị)
const KHAC = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' };

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'nam',
      element TEXT NOT NULL DEFAULT 'kim',
      level INTEGER NOT NULL DEFAULT 1,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
  }
}

function toProfile(row) {
  return {
    username: row.username, level: row.level, wins: row.wins, losses: row.losses,
    best_streak: row.best_streak, gender: row.gender, element: row.element,
  };
}

// ---- AUTH ROUTES ----
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, gender, element } = req.body || {};
    if (!username || !password || username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: 'Tên đăng nhập >= 3 ký tự, mật khẩu >= 4 ký tự' });
    }
    const g = GENDERS.includes(gender) ? gender : 'nam';
    const el = ELEMENTS.includes(element) ? element : 'kim';

    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, gender, element) VALUES ($1,$2,$3,$4) RETURNING *',
      [username, hash, g, el]
    );
    const user = result.rows[0];
    res.json({ token: sign(user), profile: toProfile(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username || '']);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    res.json({ token: sign(user), profile: toProfile(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

app.get('/api/profile', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json({ profile: toProfile(user) });
});

// Ghi lại kết quả trận đấu (thắng / thua) vào SQL
app.post('/api/result', auth, async (req, res) => {
  const { result: outcome, streak } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = r.rows[0];
  if (!user) return res.status(404).json({ error: 'Không tìm thấy' });

  let { wins, losses, level, best_streak } = user;
  if (outcome === 'win') {
    wins += 1;
    if ((streak || 0) > best_streak) best_streak = streak;
    if (wins % 3 === 0) level += 1; // lên cấp mỗi 3 lần hạ gục
  } else if (outcome === 'lose') {
    losses += 1;
  }
  const updated = await pool.query(
    'UPDATE users SET wins=$1, losses=$2, level=$3, best_streak=$4 WHERE id=$5 RETURNING *',
    [wins, losses, level, best_streak, user.id]
  );
  res.json({ profile: toProfile(updated.rows[0]) });
});

// Bảng xếp hạng
app.get('/api/leaderboard', async (req, res) => {
  const r = await pool.query('SELECT username, level, wins, losses, element FROM users ORDER BY wins DESC, level DESC LIMIT 20');
  res.json({ leaderboard: r.rows });
});

app.get('/healthz', (req, res) => res.send('ok'));

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Đảo Trojan server đang chạy tại cổng ${PORT}`));
  })
  .catch((e) => {
    console.error('Không thể khởi tạo database:', e.message);
    process.exit(1);
  });
