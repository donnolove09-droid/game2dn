// ================= Đảo Trojan — game.js (Arena / MOBA-style controls) =================
const $ = (id) => document.getElementById(id);
let TOKEN = localStorage.getItem('dt_token') || null;
let PROFILE = null;

// ---------- API helper ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi máy chủ');
  return data;
}

// ---------- AUTH UI ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $('loginForm').classList.toggle('hidden', tab !== 'login');
    $('registerForm').classList.toggle('hidden', tab !== 'register');
    $('authMsg').textContent = '';
  });
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('loginUser').value.trim(), password: $('loginPass').value }),
    });
    onAuthed(data);
  } catch (err) { $('authMsg').textContent = err.message; }
});

let pickedGender = 'nam', pickedElement = 'kim';
document.querySelectorAll('#genderPick .pick-opt').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#genderPick .pick-opt').forEach((x) => x.classList.remove('active'));
  b.classList.add('active'); pickedGender = b.dataset.value;
}));
document.querySelectorAll('#elementPick .pick-opt').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#elementPick .pick-opt').forEach((x) => x.classList.remove('active'));
  b.classList.add('active'); pickedElement = b.dataset.value;
}));

$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: $('regUser').value.trim(), password: $('regPass').value,
        gender: pickedGender, element: pickedElement,
      }),
    });
    onAuthed(data);
  } catch (err) { $('authMsg').textContent = err.message; }
});

function onAuthed(data) {
  TOKEN = data.token;
  PROFILE = data.profile;
  localStorage.setItem('dt_token', TOKEN);
  $('authScreen').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  updateProfileBar();
  initArena();
}

$('btnLogout').addEventListener('click', () => {
  TOKEN = null; PROFILE = null;
  localStorage.removeItem('dt_token');
  running = false;
  $('gameScreen').classList.add('hidden');
  $('authScreen').classList.remove('hidden');
});

const ELEMENT_INFO = {
  kim: { icon: '⚙️', label: 'Kim' }, moc: { icon: '🌳', label: 'Mộc' }, thuy: { icon: '💧', label: 'Thủy' },
  hoa: { icon: '🔥', label: 'Hỏa' }, tho: { icon: '🪨', label: 'Thổ' },
};
// Ngũ Hành tương khắc: key khắc value → bên tấn công hệ "key" gây thêm sát thương lên bên hệ "value"
const KHAC = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' };

function updateProfileBar() {
  $('profileInfo').textContent = `${PROFILE.username} • Thắng ${PROFILE.wins} / Thua ${PROFILE.losses}`;
  $('levelBadge').textContent = `Cấp ${PROFILE.level}`;
  $('playerName').childNodes[0].textContent = PROFILE.username + ' ';
  const info = ELEMENT_INFO[PROFILE.element] || ELEMENT_INFO.kim;
  $('elementBadge').textContent = info.icon;
  $('elementBadge').title = 'Hệ ' + info.label;
}

function elementMultiplier(attackerEl, defenderEl) {
  if (KHAC[attackerEl] === defenderEl) return { mult: 1.5, tag: 'Khắc chế!' };
  if (KHAC[defenderEl] === attackerEl) return { mult: 0.7, tag: 'Bị khắc' };
  return { mult: 1, tag: null };
}

(async function tryAutoLogin() {
  if (!TOKEN) return;
  try {
    const data = await api('/api/profile');
    PROFILE = data.profile;
    $('authScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    updateProfileBar();
    initArena();
  } catch { TOKEN = null; localStorage.removeItem('dt_token'); }
})();

// ---------- LEADERBOARD ----------
$('btnLeaderboard').addEventListener('click', async () => {
  const { leaderboard } = await api('/api/leaderboard');
  $('leaderboardList').innerHTML = leaderboard
    .map((r) => `<li>${r.username} — Cấp ${r.level} — ${r.wins}T/${r.losses}B</li>`)
    .join('') || '<li>Chưa có ai thi đấu</li>';
  $('leaderboardModal').classList.remove('hidden');
});
$('closeLeaderboard').addEventListener('click', () => $('leaderboardModal').classList.add('hidden'));

// ================= ASSET LOADING =================
const IMG = {};
function loadImg(key, src) { const i = new Image(); i.src = src; IMG[key] = i; return i; }
const ASSET_LIST = [
  ['bg', 'assets/bg/battleground_ruins.png'],
  ['p_idle', 'assets/player/idle.png'], ['p_walk', 'assets/player/walk.png'], ['p_attack', 'assets/player/attack.png'],
  ['p_hurt', 'assets/player/hurt.png'], ['p_dead', 'assets/player/dead.png'],
  ['d_ruin_a', 'assets/decor/ruin_a.png'], ['d_ruin_b', 'assets/decor/ruin_b.png'], ['d_ruin_c', 'assets/decor/ruin_c.png'],
  ['d_tree_a', 'assets/decor/tree_a.png'], ['d_tree_b', 'assets/decor/tree_b.png'],
  ['d_luminous', 'assets/decor/forest_luminous.png'], ['d_willow', 'assets/decor/forest_willow.png'],
  ['d_ent', 'assets/decor/forest_ent.png'], ['d_mushroom', 'assets/decor/forest_mushroom.png'], ['d_idol', 'assets/decor/forest_idol.png'],
  ['d_rock_a', 'assets/decor/rock_a.png'], ['d_rock_b', 'assets/decor/rock_b.png'], ['d_rock_c', 'assets/decor/rock_c.png'],
];
[1, 2, 3].forEach((n) => {
  ['idle', 'attack', 'hurt', 'death'].forEach((st) => ASSET_LIST.push([`s${n}_${st}`, `assets/slime${n}/${st}.png`]));
});
['fire', 'water', 'lightning'].forEach((k) => {
  for (let i = 1; i <= 12; i++) ASSET_LIST.push([`fx_${k}${i}`, `assets/slash/${k}_${i}.png`]);
});
ASSET_LIST.forEach(([k, s]) => loadImg(k, s));

// ---------- Sprite-sheet animation definitions (dùng đủ khung hình gốc, không chỉ 1 khung tĩnh) ----------
const PLAYER_ANIM = {
  idle:   { img: 'p_idle',   fw: 128, fh: 128, frames: 6, fps: 7,  loop: true },
  walk:   { img: 'p_walk',   fw: 128, fh: 128, frames: 8, fps: 12, loop: true },
  attack: { img: 'p_attack', fw: 128, fh: 128, frames: 5, fps: 15, loop: false },
  hurt:   { img: 'p_hurt',   fw: 128, fh: 128, frames: 2, fps: 8,  loop: false },
  dead:   { img: 'p_dead',   fw: 128, fh: 128, frames: 4, fps: 6,  loop: false, hold: true },
};
function slimeAnim(type) {
  return {
    idle:   { img: `s${type}_idle`,   fw: 64, fh: 64, frames: 6,  fps: 6,  loop: true },
    walk:   { img: `s${type}_idle`,   fw: 64, fh: 64, frames: 6,  fps: 9,  loop: true },
    attack: { img: `s${type}_attack`, fw: 64, fh: 64, frames: 10, fps: 16, loop: false },
    hurt:   { img: `s${type}_hurt`,   fw: 64, fh: 64, frames: 5,  fps: 12, loop: false },
    dead:   { img: `s${type}_death`,  fw: 64, fh: 64, frames: 10, fps: 12, loop: false, hold: true },
  };
}
function stepAnim(entity, cfg, dt) {
  if (!cfg) return;
  entity.frameTimer = (entity.frameTimer || 0) + dt;
  const frameDur = 1 / cfg.fps;
  while (entity.frameTimer >= frameDur) {
    entity.frameTimer -= frameDur;
    entity.frameIndex++;
    if (entity.frameIndex >= cfg.frames) {
      if (cfg.loop) entity.frameIndex = 0;
      else { entity.frameIndex = cfg.frames - 1; entity.animDone = true; }
    }
  }
}
function setAnimState(entity, state) {
  if (entity.state === state) return;
  entity.state = state; entity.frameIndex = 0; entity.frameTimer = 0; entity.animDone = false;
}
function drawAnimSprite(cfg, frameIndex, x, y, destH, flip) {
  const img = IMG[cfg.img];
  if (!img || !img.complete || !img.naturalWidth) return;
  const destW = cfg.fw * (destH / cfg.fh);
  const sx = x - camera.x, sy = y - camera.y;
  ctx.save();
  if (flip) { ctx.translate(sx, sy); ctx.scale(-1, 1); ctx.drawImage(img, frameIndex * cfg.fw, 0, cfg.fw, cfg.fh, -destW / 2, -destH, destW, destH); }
  else { ctx.drawImage(img, frameIndex * cfg.fw, 0, cfg.fw, cfg.fh, sx - destW / 2, sy - destH, destW, destH); }
  ctx.restore();
}

// ================= WORLD / CAMERA =================
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
const VIEW_W = 960, VIEW_H = 540;
const WORLD_W = 1920, WORLD_H = 1080;
const camera = { x: 0, y: 0 };

// Static scenery — spread across the whole world using pieces from every uploaded pack
const DECOR = [
  { img: 'd_ruin_a', x: 140, y: 160, h: 190 }, { img: 'd_ruin_b', x: 1720, y: 150, h: 170 },
  { img: 'd_ruin_c', x: 900, y: 90, h: 150 },
  { img: 'd_tree_a', x: 60, y: 850, h: 230 }, { img: 'd_tree_b', x: 1800, y: 860, h: 200 },
  { img: 'd_luminous', x: 420, y: 780, h: 150 }, { img: 'd_willow', x: 1500, y: 800, h: 170 },
  { img: 'd_ent', x: 260, y: 430, h: 160 }, { img: 'd_idol', x: 1620, y: 460, h: 150 },
  { img: 'd_mushroom', x: 760, y: 860, h: 70 }, { img: 'd_mushroom', x: 1120, y: 900, h: 70 },
  { img: 'd_rock_a', x: 520, y: 520, h: 60 }, { img: 'd_rock_b', x: 1360, y: 560, h: 60 },
  { img: 'd_rock_c', x: 960, y: 960, h: 55 }, { img: 'd_rock_a', x: 1680, y: 700, h: 55 },
  { img: 'd_rock_b', x: 260, y: 700, h: 55 },
];

const SLIME_NAMES = { 1: 'Slime Lam', 2: 'Slime Gai', 3: 'Slime Lửa' };

const SKILLS = {
  fire:      { label: 'Hỏa Kiếm',  dmg: [20, 30], fx: 'fx_fire',  range: 210, mp: 20 },
  water:     { label: 'Thủy Kiếm', dmg: [16, 24], fx: 'fx_water', range: 230, mp: 15 },
  lightning: { label: 'Lôi Kiếm',  dmg: [24, 34], fx: 'fx_ltn',   range: 260, mp: 25 },
};

let player, slimes, particles, floaters, fxList, killCount, streak, running;
let cooldownUntil = { fire: 0, water: 0, lightning: 0 };
let attackLocked = false;

function rand(min, max) { return Math.random() * (max - min) + min; }
function ri(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function initArena() {
  player = {
    x: WORLD_W / 2, y: WORLD_H / 2, hp: 100, maxHp: 100, mp: 100, maxMp: 100,
    element: PROFILE.element || 'kim',
    facing: 1, dead: false, regenTimer: 0, hurtFlash: 0,
    state: 'idle', frameIndex: 0, frameTimer: 0, animDone: false,
  };
  slimes = [];
  particles = [];
  floaters = [];
  fxList = [];
  killCount = 0;
  streak = 0;
  cooldownUntil = { fire: 0, water: 0, lightning: 0 };
  spawnWave(5);
  updateHudNumbers();
  $('resultBanner').classList.add('hidden');
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function spawnWave(count) {
  const lvl = PROFILE ? PROFILE.level : 1;
  for (let i = 0; i < count; i++) {
    spawnSlime(lvl);
  }
}

function spawnSlime(lvl) {
  const type = ri(1, 3);
  let x, y;
  do {
    x = rand(120, WORLD_W - 120);
    y = rand(120, WORLD_H - 120);
  } while (dist({ x, y }, player) < 260);
  const elements = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  slimes.push({
    type, name: SLIME_NAMES[type], anim: slimeAnim(type),
    x, y, hp: 40 + (lvl - 1) * 10, maxHp: 40 + (lvl - 1) * 10,
    element: elements[ri(0, 4)],
    state: 'idle', frameIndex: 0, frameTimer: 0, animDone: false,
    facing: 1, lastAttack: 0, deadAt: 0,
  });
}

// ================= JOYSTICK =================
const joyBase = $('joyBase'), joyKnob = $('joyKnob'), joyZone = $('joystickZone');
let joyActive = false, joyVec = { x: 0, y: 0 }, joyPointerId = null, joyOrigin = { x: 0, y: 0 };
const JOY_RADIUS = 50;

function joyStart(e) {
  joyActive = true;
  joyPointerId = e.pointerId;
  const rect = joyBase.getBoundingClientRect();
  joyOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  joyZone.setPointerCapture(e.pointerId);
  joyMove(e);
}
function joyMove(e) {
  if (!joyActive || e.pointerId !== joyPointerId) return;
  let dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y;
  const d = Math.hypot(dx, dy);
  if (d > JOY_RADIUS) { dx = (dx / d) * JOY_RADIUS; dy = (dy / d) * JOY_RADIUS; }
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joyVec = { x: dx / JOY_RADIUS, y: dy / JOY_RADIUS };
}
function joyEnd(e) {
  if (e.pointerId !== joyPointerId) return;
  joyActive = false; joyVec = { x: 0, y: 0 };
  joyKnob.style.transform = 'translate(-50%, -50%)';
}
joyZone.addEventListener('pointerdown', joyStart);
joyZone.addEventListener('pointermove', joyMove);
joyZone.addEventListener('pointerup', joyEnd);
joyZone.addEventListener('pointercancel', joyEnd);

// ================= COMBAT =================
function greenBurst(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x, y, vx: rand(-70, 70), vy: rand(-110, -20), life: rand(0.4, 0.8),
      maxLife: 0.8, color: Math.random() > 0.5 ? '#7CFC6E' : '#3fae3f', size: rand(3, 6),
    });
  }
}
function floatText(x, y, text, color) { floaters.push({ x, y, text, color, life: 0.9 }); }

function playFx(kind, x, y) {
  fxList.push({ kind, x, y, frame: 1, timer: 0 });
}

function damageSlime(s, baseDmg) {
  if (s.state === 'dead') return;
  const { mult, tag } = elementMultiplier(player.element, s.element);
  const dmg = Math.round(baseDmg * mult);
  s.hp -= dmg;
  setAnimState(s, 'hurt');
  greenBurst(s.x, s.y - 20);
  floatText(s.x, s.y - 40, '-' + dmg, mult > 1 ? '#ff7043' : '#fff59d');
  if (tag) floatText(s.x, s.y - 58, tag, mult > 1 ? '#ffca28' : '#b0bec5');
  if (s.hp <= 0) killSlime(s);
}

async function killSlime(s) {
  setAnimState(s, 'dead'); s.deadAt = performance.now();
  greenBurst(s.x, s.y - 10);
  greenBurst(s.x, s.y - 10);
  killCount++; streak++;
  updateHudNumbers();
  try {
    const data = await api('/api/result', { method: 'POST', body: JSON.stringify({ result: 'win', streak }) });
    const leveledUp = data.profile.level !== PROFILE.level;
    PROFILE = data.profile;
    updateProfileBar();
    if (leveledUp) showResult(true, 'Lên cấp mới!');
  } catch {}
  setTimeout(() => {
    slimes = slimes.filter((x) => x !== s);
    spawnSlime(PROFILE ? PROFILE.level : 1);
  }, 1400);
}

function meleeAttack() {
  if (attackLocked || player.dead) return;
  attackLocked = true;
  setAnimState(player, 'attack');
  const range = 130;
  slimes.forEach((s) => {
    if (s.state !== 'dead' && dist(player, s) < range) damageSlime(s, ri(9, 15));
  });
  playFx('fx_fire', player.x + player.facing * 60, player.y - 20); // hiệu ứng cho đòn thường
  setTimeout(() => { attackLocked = false; }, 380);
}
$('btnAttack').addEventListener('click', meleeAttack);

function useSkill(key) {
  if (player.dead) return;
  if (performance.now() < cooldownUntil[key]) return;
  const skill = SKILLS[key];
  if (player.mp < skill.mp) {
    floatText(player.x, player.y - 90, 'Không đủ MP!', '#4aa3ff');
    return;
  }
  player.mp -= skill.mp;
  const dmg = ri(skill.dmg[0], skill.dmg[1]);
  let hitAny = false;
  slimes.forEach((s) => {
    if (s.state !== 'dead' && dist(player, s) < skill.range) {
      hitAny = true;
      damageSlime(s, dmg);
      playFx(skill.fx, s.x, s.y - 20);
    }
  });
  if (!hitAny) playFx(skill.fx, player.x + player.facing * 90, player.y - 20);
  setAnimState(player, 'attack');

  const cdSeconds = ri(1, 7); // hồi chiêu ngẫu nhiên 1-7 giây, độc lập từng nút
  const until = performance.now() + cdSeconds * 1000;
  cooldownUntil[key] = until;
  const btnId = key === 'fire' ? 'btnFire' : key === 'water' ? 'btnWater' : 'btnLightning';
  const cdId = key === 'fire' ? 'cdFire' : key === 'water' ? 'cdWater' : 'cdLightning';
  $(btnId).disabled = true;
  const iv = setInterval(() => {
    const left = Math.max(0, Math.ceil((until - performance.now()) / 1000));
    $(cdId).textContent = left > 0 ? left : '';
    if (left <= 0) { clearInterval(iv); $(btnId).disabled = false; }
  }, 100);
}
['fire', 'water', 'lightning'].forEach((k) => {
  const id = k === 'fire' ? 'btnFire' : k === 'water' ? 'btnWater' : 'btnLightning';
  $(id).addEventListener('click', () => useSkill(k));
});

async function playerDies() {
  if (player.dead) return;
  player.dead = true;
  streak = 0;
  try {
    const data = await api('/api/result', { method: 'POST', body: JSON.stringify({ result: 'lose', streak: 0 }) });
    PROFILE = data.profile;
    updateProfileBar();
  } catch {}
  showResult(false);
}

function showResult(won, customMsg) {
  $('resultPanelImg').src = won ? 'assets/ui/win_panel.png' : 'assets/ui/lose_panel.png';
  $('resultBanner').classList.remove('hidden');
}
$('nextBtn').addEventListener('click', () => {
  $('resultBanner').classList.add('hidden');
  if (player.dead) {
    player.hp = player.maxHp; player.mp = player.maxMp; player.dead = false;
    player.x = WORLD_W / 2; player.y = WORLD_H / 2;
  }
});

function updateHudNumbers() {
  $('killCounter').textContent = 'Hạ gục: ' + killCount;
}

// ================= GAME LOOP =================
let lastTime = 0;
const SPEED = 210; // px/s

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt, now);
  render(now);
  requestAnimationFrame(loop);
}

function update(dt, now) {
  // --- player movement ---
  if (!player.dead) {
    const mag = Math.hypot(joyVec.x, joyVec.y);
    const moving = mag > 0.15;
    if (moving) {
      const nx = joyVec.x / Math.max(mag, 1);
      const ny = joyVec.y / Math.max(mag, 1);
      player.x = Math.max(30, Math.min(WORLD_W - 30, player.x + nx * SPEED * dt));
      player.y = Math.max(30, Math.min(WORLD_H - 30, player.y + ny * SPEED * dt));
      if (Math.abs(joyVec.x) > 0.2) player.facing = joyVec.x > 0 ? 1 : -1;
    }
    // Ưu tiên hoạt ảnh đánh/trúng đòn cho tới khi phát xong, sau đó mới quay lại đi/đứng yên
    if (!((player.state === 'attack' || player.state === 'hurt') && !player.animDone)) {
      setAnimState(player, moving ? 'walk' : 'idle');
    }
    if (player.hurtFlash > 0) player.hurtFlash -= dt;

    // Auto hồi HP/MP theo thời gian (giống tính năng "auto bơm HP/MP" của KPAH)
    player.regenTimer += dt;
    if (player.regenTimer >= 1) {
      player.regenTimer = 0;
      player.hp = Math.min(player.maxHp, player.hp + 1.5);
      player.mp = Math.min(player.maxMp, player.mp + 6);
    }
  }
  stepAnim(player, PLAYER_ANIM[player.state], dt);

  // --- enemy AI ---
  slimes.forEach((s) => {
    if (s.state === 'dead') { stepAnim(s, s.anim.dead, dt); return; }
    const d = dist(player, s);
    const busy = (s.state === 'attack' || s.state === 'hurt') && !s.animDone;
    if (!player.dead && d < 260) {
      s.facing = player.x > s.x ? 1 : -1;
      if (!busy && d > 55) {
        const dx = (player.x - s.x) / d, dy = (player.y - s.y) / d;
        s.x += dx * 70 * dt; s.y += dy * 70 * dt;
        setAnimState(s, 'walk');
      } else if (!busy && now - s.lastAttack > ri(900, 1700)) {
        s.lastAttack = now;
        setAnimState(s, 'attack');
        const { mult } = elementMultiplier(s.element, player.element);
        const dmg = Math.round(ri(4, 9) * mult);
        player.hp = Math.max(0, player.hp - dmg);
        player.hurtFlash = 0.2;
        setAnimState(player, 'hurt');
        floatText(player.x, player.y - 60, '-' + dmg, '#ff8a80');
        $('playerHpFill').style.width = (player.hp / player.maxHp * 100) + '%';
        if (player.hp <= 0) playerDies();
      }
    } else if (!busy) {
      setAnimState(s, 'idle');
    }
    stepAnim(s, s.anim[s.state], dt);
  });

  // --- particles ---
  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; });
  particles = particles.filter((p) => p.life > 0);
  floaters.forEach((f) => { f.y -= 40 * dt; f.life -= dt; });
  floaters = floaters.filter((f) => f.life > 0);
  fxList.forEach((f) => { f.timer += dt; if (f.timer > 0.032) { f.timer = 0; f.frame++; } });
  fxList = fxList.filter((f) => f.frame <= 12);

  // camera follows player, clamped to world
  camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W / 2));
  camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, player.y - VIEW_H / 2));
}

function drawSprite(img, x, y, h, flip) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const w = img.naturalWidth * (h / img.naturalHeight);
  const sx = x - camera.x, sy = y - camera.y;
  ctx.save();
  if (flip) { ctx.translate(sx, sy); ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h, w, h); }
  else { ctx.drawImage(img, sx - w / 2, sy - h, w, h); }
  ctx.restore();
}

function drawHpBar(x, y, w, pct, color) {
  const sx = x - camera.x - w / 2, sy = y - camera.y;
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 1, sy - 1, w + 2, 8);
  ctx.fillStyle = '#1b140d'; ctx.fillRect(sx, sy, w, 6);
  ctx.fillStyle = color; ctx.fillRect(sx, sy, w * Math.max(0, pct), 6);
}

function render(now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const bg = IMG.bg;
  if (bg && bg.complete) {
    ctx.drawImage(bg, camera.x * (bg.naturalWidth / WORLD_W), camera.y * (bg.naturalHeight / WORLD_H),
      VIEW_W * (bg.naturalWidth / WORLD_W), VIEW_H * (bg.naturalHeight / WORLD_H),
      0, 0, VIEW_W, VIEW_H);
  } else { ctx.fillStyle = '#2b3d22'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

  // gather drawable entities for y-sorted depth
  const drawables = [];
  DECOR.forEach((d) => drawables.push({ y: d.y, draw: () => drawSprite(IMG[d.img], d.x, d.y, d.h, false) }));
  slimes.forEach((s) => drawables.push({
    y: s.y, draw: () => {
      const cfg = s.anim[s.state];
      if (s.state === 'dead') {
        const age = (now - s.deadAt) / 1000;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 1.4);
        drawAnimSprite(cfg, s.frameIndex, s.x, s.y, 60, s.facing < 0);
        ctx.restore();
        return;
      }
      drawAnimSprite(cfg, s.frameIndex, s.x, s.y, 58, s.facing < 0);
      drawHpBar(s.x, s.y - 66, 46, s.hp / s.maxHp, '#e53935');
    }
  }));
  drawables.push({
    y: player.y, draw: () => {
      ctx.save();
      if (player.hurtFlash > 0) ctx.filter = 'brightness(2) saturate(0)';
      drawAnimSprite(PLAYER_ANIM[player.state], player.frameIndex, player.x, player.y, 118, player.facing < 0);
      ctx.restore();
    }
  });
  drawables.sort((a, b) => a.y - b.y);
  drawables.forEach((d) => d.draw());

  // fx layer (đủ 12 khung/hiệu ứng thay vì chỉ 3)
  fxList.forEach((f) => {
    const img = IMG[f.kind + Math.min(12, f.frame)];
    if (!img || !img.complete) return;
    const w = 170, h = 128;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(img, f.x - camera.x - w / 2, f.y - camera.y - h / 2, w, h);
    ctx.globalAlpha = 1;
  });

  // particles (slime green blood)
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // floating damage text
  floaters.forEach((f) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x - camera.x, f.y - camera.y);
    ctx.fillText(f.text, f.x - camera.x, f.y - camera.y);
  });
  ctx.globalAlpha = 1;

  // đồng bộ thanh HP/MP (kể cả sau hồi sinh hoặc hồi máu tự động)
  $('playerHpFill').style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
  $('playerMpFill').style.width = Math.max(0, player.mp / player.maxMp * 100) + '%';
}
