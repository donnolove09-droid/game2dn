// server.js — Đảo Trojan: backend Express + SQLite (better-sqlite3)
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dao-trojan-super-secret-change-me';

// DB path: on Render, gắn 1 Persistent Disk và trỏ DB_PATH vào đó để dữ liệu
// không mất khi service redeploy. Mặc định lưu trong ./db (ephemeral trên free tier).
const DB_DIR = process.env.DB_PATH || path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'game.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

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

// ---- AUTH ROUTES ----
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Tên đăng nhập >= 3 ký tự, mật khẩu >= 4 ký tự' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  const user = { id: info.lastInsertRowid, username };
  res.json({ token: sign(user), profile: { username, level: 1, wins: 0, losses: 0 } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  res.json({
    token: sign(user),
    profile: { username: user.username, level: user.level, wins: user.wins, losses: user.losses },
  });
});

app.get('/api/profile', auth, (req, res) => {
  const user = db.prepare('SELECT username, level, wins, losses, best_streak FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json({ profile: user });
});

// Ghi lại kết quả trận đấu (thắng / thua) vào SQL
app.post('/api/result', auth, (req, res) => {
  const { result, streak } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy' });

  let { wins, losses, level, best_streak } = user;
  if (result === 'win') {
    wins += 1;
    if ((streak || 0) > best_streak) best_streak = streak;
    if (wins % 3 === 0) level += 1; // lên cấp mỗi 3 thắng
  } else if (result === 'lose') {
    losses += 1;
  }
  db.prepare('UPDATE users SET wins=?, losses=?, level=?, best_streak=? WHERE id=?')
    .run(wins, losses, level, best_streak, user.id);

  res.json({ profile: { username: user.username, level, wins, losses, best_streak } });
});

// Bảng xếp hạng
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare('SELECT username, level, wins, losses FROM users ORDER BY wins DESC, level DESC LIMIT 20').all();
  res.json({ leaderboard: rows });
});

app.get('/healthz', (req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Đảo Trojan server đang chạy tại cổng ${PORT}`);
});
