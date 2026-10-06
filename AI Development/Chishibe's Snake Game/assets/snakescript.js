// Made by Chishibe Kabwe.

// CONFIG ---------------------------------------------------------------------
const UI_ASSETS = {
    panel: 'assets/UI Assets/panel.png', btnHex: 'assets/UI Assets/btn_hex.png', btnArrow: 'assets/UI Assets/btn_arrow.png', btnRect: 'assets/UI Assets/btn_rect.png', btnLongGreen: 'assets/UI Assets/btn_long_green.png',
    sqMenu: 'assets/UI Assets/sq_menu.png', sqRestart: 'assets/UI Assets/sq_restart.png', sqSettings: 'assets/UI Assets/sq_settings.png', sqInfo: 'assets/UI Assets/sq_info.png', sqHome: 'assets/UI Assets/sq_home.png', sqSoundOn: 'assets/UI Assets/sq_sound_on.png', sqSoundOff: 'assets/UI Assets/sq_sound_off.png', sqBlankWood: 'assets/UI Assets/sq_blank_wood.png', sqBlankGreen: 'assets/UI Assets/sq_blank_green.png',
    roundMenu: 'assets/UI Assets/round_menu.png', roundRestart: 'assets/UI Assets/round_restart.png', roundSettings: 'assets/UI Assets/round_settings.png', roundInfo: 'assets/UI Assets/round_info.png', roundHome: 'assets/UI Assets/round_home.png', roundSoundOn: 'assets/UI Assets/round_sound_on.png', roundSoundOff: 'assets/UI Assets/round_sound_off.png', roundBlankWood: 'assets/UI Assets/round_blank_wood.png', roundBlankGreen: 'assets/UI Assets/round_blank_green.png',
    starEmpty: 'assets/UI Assets/star_empty.png', starFilled: 'assets/UI Assets/star_filled.png', gemLeft: 'assets/UI Assets/gem_left.png', gemRight: 'assets/UI Assets/gem_right.png', iconCheck: 'assets/UI Assets/icon_check.png', iconCross: 'assets/UI Assets/icon_cross.png'
};
for (let index = 0; index <= 5; index += 1) UI_ASSETS[`progress${index}`] = `assets/UI Assets/progress_${index}_of_5.png`;

const CONFIG = {
    grid: { size: 24, pixels: 480 },
    difficulty: {
        easy: { base: 190, step: 5, minimum: 72, obstacleLevel: 99 },
        normal: { base: 150, step: 6, minimum: 58, obstacleLevel: 3 },
        hard: { base: 105, step: 8, minimum: 42, obstacleLevel: 1 }
    },
    food: { goldenEvery: 8, goldenLifetime: 6000, powerupChance: 0.22, comboWindow: 3000 },
    powerups: { slowDuration: 5000, slowFactor: 1.3, multiplierDuration: 8000, shrinkAmount: 3 },
    level: { points: 10, obstacleCount: 2, bannerDuration: 1500 },
    game: { initialLength: 3, maxQueue: 2, minSnakeLength: 3, particles: 18, particleLife: 520, shakeDuration: 340 },
    COLORS: { greenDark: '#11a636', greenMid: '#23b445', greenLight: '#34c154', greenBright: '#43ce6c', greenHighlight: '#a2fdb5', greenOutline: '#296d42', greenShadow: '#2d4d46', woodLight: '#bb512e', woodMid: '#a74531', woodDark: '#933935', woodRim: '#e88e4b', plum: '#5b193d', plumDeep: '#2a0b22', cream: '#ffe9c7', gold: '#ffc857', grid: '#6d3034', gridAlt: '#7d3535', food: '#e88e4b', obstacle: '#5b193d', particle: '#43ce6c' },
    storageKey: 'chishibe-snake-v2'
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('game-frame');
const tile = CONFIG.grid.pixels / CONFIG.grid.size;

// STATE ----------------------------------------------------------------------
const state = {
    difficulty: 'normal', mode: 'classic', snake: [], previousSnake: [], direction: { x: 1, y: 0 }, queue: [],
    obstacles: [], foods: [], particles: [], score: 0, level: 1, foodsEaten: 0, longestCombo: 1,
    combo: 1, lastFoodAt: 0, startedAt: 0, elapsed: 0, lastTick: 0, accumulator: 0, lastFrame: 0,
    running: false, paused: false, over: false, menuOpen: true, mute: false, bannerTimer: 0,
    powerups: { slow: 0, multiplier: 0 }, touchStart: null, scores: {}, leaderboard: []
};
let audioContext = null;

// STORAGE --------------------------------------------------------------------
function readStorage() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); } catch (error) { return {}; }
}

function saveStorage() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ difficulty: state.difficulty, mode: state.mode, mute: state.mute, scores: state.scores, leaderboard: state.leaderboard })); } catch (error) { /* Storage can be unavailable in private contexts. */ }
}

function loadSettings() {
    const saved = readStorage();
    state.difficulty = CONFIG.difficulty[saved.difficulty] ? saved.difficulty : 'normal';
    state.mode = saved.mode === 'wrap' ? 'wrap' : 'classic';
    state.mute = Boolean(saved.mute);
    state.scores = saved.scores || {};
    state.leaderboard = Array.isArray(saved.leaderboard) ? saved.leaderboard : [];
}

function scoreKey() { return `${state.difficulty}-${state.mode}`; }
function highScore() { return Number(state.scores[scoreKey()] || 0); }

// INPUT ----------------------------------------------------------------------
function directionFromKey(key) {
    const directions = { arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 }, arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 } };
    return directions[key.toLowerCase()];
}

function queueDirection(next) {
    const last = state.queue[state.queue.length - 1] || state.direction;
    if (next.x === last.x && next.y === last.y) return;
    if (next.x === -last.x && next.y === -last.y) return;
    if (state.queue.length < CONFIG.game.maxQueue) state.queue.push(next);
    if (!state.running && !state.over && !state.menuOpen) startRun();
    ensureAudio();
}

function handleKey(event) {
    const key = event.key.toLowerCase();
    const next = directionFromKey(key);
    if (next) { event.preventDefault(); queueDirection(next); return; }
    if (key === ' ' || key === 'p') { event.preventDefault(); if (state.running || state.paused) togglePause(); return; }
    if (key === 'r') { event.preventDefault(); resetGame(); startRun(); return; }
    if (key === 'm') { event.preventDefault(); toggleMute(); return; }
    if (key === 'escape') { event.preventDefault(); openMenu(); }
}

function setupTouchControls() {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    const dpad = document.createElement('div'); dpad.className = 'dpad'; dpad.setAttribute('aria-label', 'Touch controls');
    [['Up', 0, -1], ['Left', -1, 0], ['Down', 0, 1], ['Right', 1, 0]].forEach(([label, x, y]) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = `dpad-${label.toLowerCase()}`; button.setAttribute('aria-label', `Move ${label}`); button.addEventListener('click', () => queueDirection({ x, y })); dpad.appendChild(button);
    });
    stage.appendChild(dpad);
}

function handleTouchStart(event) { state.touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }
function handleTouchEnd(event) {
    if (!state.touchStart) return;
    const touch = event.changedTouches[0]; const dx = touch.clientX - state.touchStart.x; const dy = touch.clientY - state.touchStart.y; state.touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    queueDirection(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
}

// UPDATE ---------------------------------------------------------------------
function resetGame() {
    const center = Math.floor(CONFIG.grid.size / 2);
    state.snake = Array.from({ length: CONFIG.game.initialLength }, (_, index) => ({ x: center - index, y: center }));
    state.previousSnake = state.snake.map(copyCell); state.direction = { x: 1, y: 0 }; state.queue = [];
    state.obstacles = []; state.foods = []; state.particles = []; state.score = 0; state.level = 1; state.foodsEaten = 0; state.combo = 1; state.longestCombo = 1; state.lastFoodAt = 0; state.elapsed = 0; state.accumulator = 0; state.over = false; state.paused = false;
    state.powerups = { slow: 0, multiplier: 0 }; spawnFood();
    if (state.difficulty === 'hard') addObstacles(2);
    updateHUD(); hideOverlay('overlay-gameover'); hideOverlay('overlay-pause');
}

function startRun() {
    if (state.over) resetGame();
    if (!state.running) { state.running = true; state.menuOpen = false; state.startedAt = performance.now(); state.lastTick = performance.now(); state.lastFrame = performance.now(); hideOverlay('overlay-start'); updateStatus('Use arrows or WASD to steer.'); }
}

function togglePause() {
    if (!state.running && !state.paused) return;
    state.paused = !state.paused; state.running = !state.paused; toggleOverlay('overlay-pause', state.paused); updateStatus(state.paused ? 'Run paused.' : 'Back in motion.');
}

function tickInterval() {
    const setting = CONFIG.difficulty[state.difficulty];
    let interval = Math.max(setting.minimum, setting.base - (state.level - 1) * setting.step);
    if (state.powerups.slow > performance.now()) interval *= CONFIG.powerups.slowFactor;
    return interval;
}

function update(now) {
    if (!state.running || state.paused || state.over) return;
    state.elapsed = now - state.startedAt;
    state.powerups.slow = Math.max(0, state.powerups.slow); state.powerups.multiplier = Math.max(0, state.powerups.multiplier);
    if (state.lastFoodAt && now - state.lastFoodAt > CONFIG.food.comboWindow) state.combo = 1;
    if (state.bannerTimer && now - state.bannerTimer > CONFIG.level.bannerDuration) hideOverlay('overlay-levelup');
    if (now - state.lastTick >= tickInterval()) { state.lastTick = now; moveSnake(now); }
    state.particles = state.particles.filter(particle => now - particle.born < CONFIG.game.particleLife);
}

function moveSnake(now) {
    state.previousSnake = state.snake.map(copyCell);
    if (state.queue.length) state.direction = state.queue.shift();
    const head = state.snake[0]; let next = { x: head.x + state.direction.x, y: head.y + state.direction.y };
    if (state.mode === 'wrap') { next.x = (next.x + CONFIG.grid.size) % CONFIG.grid.size; next.y = (next.y + CONFIG.grid.size) % CONFIG.grid.size; }
    if (isOutside(next) || contains(state.obstacles, next) || contains(state.snake, next)) { endGame(); return; }
    state.snake.unshift(next);
    const eaten = state.foods.find(food => sameCell(food, next));
    if (eaten) eatFood(eaten, now);
    else state.snake.pop();
}

function eatFood(food, now) {
    state.foods = state.foods.filter(item => item !== food); state.foodsEaten += 1;
    const withinCombo = state.lastFoodAt && now - state.lastFoodAt <= CONFIG.food.comboWindow;
    state.combo = withinCombo ? Math.min(5, state.combo + 1) : 1; state.longestCombo = Math.max(state.longestCombo, state.combo); state.lastFoodAt = now;
    if (food.kind === 'normal') { addScore(1); playTone('eat'); }
    if (food.kind === 'golden') { addScore(5); playTone('golden'); }
    if (food.kind === 'slow') { state.powerups.slow = now + CONFIG.powerups.slowDuration; playTone('power'); }
    if (food.kind === 'multiplier') { state.powerups.multiplier = now + CONFIG.powerups.multiplierDuration; playTone('power'); }
    if (food.kind === 'shrink') { state.snake.splice(Math.max(CONFIG.game.minSnakeLength, state.snake.length - CONFIG.powerups.shrinkAmount)); playTone('power'); }
    burst(nextParticleOrigin(food)); spawnFood(); updateHUD();
}

function addScore(points) {
    const multiplier = state.powerups.multiplier > performance.now() ? 2 : 1;
    state.score += (points * multiplier) + Math.max(0, state.combo - 1); const nextLevel = Math.floor(state.score / CONFIG.level.points) + 1;
    if (nextLevel > state.level) { state.level = nextLevel; addObstacles(CONFIG.level.obstacleCount); state.bannerTimer = performance.now(); document.getElementById('level-banner-value').textContent = state.level; showOverlay('overlay-levelup'); playTone('level'); }
}

function endGame() {
    state.running = false; state.over = true; state.elapsed = performance.now() - state.startedAt; playTone('gameover'); stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
    const oldBest = highScore(); const best = Math.max(oldBest, state.score); state.scores[scoreKey()] = best; state.leaderboard.push({ score: state.score, difficulty: state.difficulty, mode: state.mode, date: new Date().toISOString().slice(0, 10) }); state.leaderboard.sort((a, b) => b.score - a.score); state.leaderboard = state.leaderboard.slice(0, 5); saveStorage();
    const stars = Math.min(3, state.score >= 30 ? 3 : state.score >= 15 ? 2 : state.score >= 5 ? 1 : 0);
    document.getElementById('gameover-stars').innerHTML = Array.from({ length: 3 }, (_, index) => `<img src="${index < stars ? UI_ASSETS.starFilled : UI_ASSETS.starEmpty}" alt="${index < stars ? 'Earned star' : 'Empty star'}">`).join('');
    const highScoreNotice = document.getElementById('new-highscore'); highScoreNotice.classList.toggle('hidden', state.score <= oldBest); if (state.score > oldBest) highScoreNotice.innerHTML = `<img src="${UI_ASSETS.iconCheck}" alt=""> New high score`;
    document.getElementById('gameover-stats').innerHTML = [['Final score', state.score], ['High score', best], ['Length', state.snake.length], ['Level reached', state.level], ['Foods eaten', state.foodsEaten], ['Longest combo', `x${state.longestCombo}`], ['Time played', formatTime(state.elapsed)]].map(([label, value]) => `<div>${label}<strong>${value}</strong></div>`).join(''); showOverlay('overlay-gameover'); updateStatus('Run complete.');
}

function animate(now) {
    if (!state.lastFrame) state.lastFrame = now;
    const delta = Math.min(100, now - state.lastFrame); state.lastFrame = now;
    if (state.running && !state.paused && !state.over) { state.accumulator += delta; update(now); }
    render(now); requestAnimationFrame(animate);
}

// SPAWN ----------------------------------------------------------------------
function freeCells(extra = []) {
    const blocked = [...state.snake, ...state.obstacles, ...state.foods, ...extra]; const result = [];
    for (let y = 0; y < CONFIG.grid.size; y += 1) for (let x = 0; x < CONFIG.grid.size; x += 1) if (!contains(blocked, { x, y })) result.push({ x, y });
    return result;
}

function spawnFood() {
    const cells = freeCells(); if (!cells.length) return; const cell = cells[Math.floor(Math.random() * cells.length)]; state.foods.push({ ...cell, kind: 'normal', born: performance.now() });
    if (state.foodsEaten && state.foodsEaten % CONFIG.food.goldenEvery === 0) spawnAtRandom('golden', performance.now(), cell);
    else if (Math.random() < CONFIG.food.powerupChance) spawnAtRandom(['slow', 'multiplier', 'shrink'][Math.floor(Math.random() * 3)], performance.now(), cell);
}

function spawnAtRandom(kind, now, excluded) { const cells = freeCells([excluded]); if (cells.length) state.foods.push({ ...cells[Math.floor(Math.random() * cells.length)], kind, born: now }); }

function addObstacles(count) {
    if (state.level < CONFIG.difficulty[state.difficulty].obstacleLevel) return;
    for (let added = 0; added < count; added += 1) {
        const candidates = freeCells().filter(cell => distance(cell, state.snake[0]) >= 3).sort(() => Math.random() - 0.5); const candidate = candidates.find(cell => allFreeCellsReachable([...state.obstacles, cell]));
        if (candidate) state.obstacles.push(candidate);
    }
}

function allFreeCellsReachable(obstacles) {
    const free = []; for (let y = 0; y < CONFIG.grid.size; y += 1) for (let x = 0; x < CONFIG.grid.size; x += 1) if (!contains(state.snake, { x, y }) && !contains(obstacles, { x, y })) free.push({ x, y });
    if (!free.length) return true; const seen = new Set([`${free[0].x},${free[0].y}`]); const queue = [free[0]];
    while (queue.length) { const cell = queue.shift(); neighbors(cell).forEach(next => { const key = `${next.x},${next.y}`; if (!isOutside(next) && !contains(state.snake, next) && !contains(obstacles, next) && !seen.has(key)) { seen.add(key); queue.push(next); } }); }
    return seen.size === free.length;
}

// RENDER ---------------------------------------------------------------------
function render(now) { ctx.clearRect(0, 0, canvas.width, canvas.height); drawBoard(); drawObstacles(); drawFoods(now); drawParticles(now); drawSnake(now); updateHUD(now); }
function drawBoard() { ctx.fillStyle = CONFIG.COLORS.plumDeep; ctx.fillRect(0, 0, canvas.width, canvas.height); for (let y = 0; y < CONFIG.grid.size; y += 1) for (let x = 0; x < CONFIG.grid.size; x += 1) if ((x + y) % 2 === 0) { ctx.fillStyle = CONFIG.COLORS.grid; ctx.fillRect(x * tile, y * tile, tile, tile); } }
function drawObstacles() { state.obstacles.forEach(cell => { ctx.fillStyle = CONFIG.COLORS.obstacle; roundRect(cell.x * tile + 2, cell.y * tile + 3, tile - 4, tile - 5, 4); ctx.fill(); ctx.fillStyle = CONFIG.COLORS.woodDark; ctx.fillRect(cell.x * tile + 3, cell.y * tile + 3, tile - 6, 3); }); }
function drawFoods(now) { state.foods = state.foods.filter(food => food.kind !== 'golden' || now - food.born < CONFIG.food.goldenLifetime); state.foods.forEach(food => { const colors = { normal: CONFIG.COLORS.food, golden: CONFIG.COLORS.gold, slow: CONFIG.COLORS.greenLight, multiplier: CONFIG.COLORS.woodLight, shrink: CONFIG.COLORS.greenHighlight }; const x = food.x * tile + tile / 2; const y = food.y * tile + tile / 2; ctx.fillStyle = colors[food.kind]; ctx.beginPath(); ctx.arc(x, y, food.kind === 'golden' ? tile * .34 : tile * .27, 0, Math.PI * 2); ctx.fill(); if (food.kind === 'normal') { ctx.fillStyle = CONFIG.COLORS.cream; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fill(); } if (food.kind === 'golden') { ctx.strokeStyle = CONFIG.COLORS.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, tile * .42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - (now - food.born) / CONFIG.food.goldenLifetime)); ctx.stroke(); } }); }
function drawSnake(now) { state.snake.forEach((cell, index) => { const previous = state.previousSnake[index] || cell; const blend = state.running ? Math.min(1, (now - state.lastTick) / tickInterval()) : 1; const x = lerp(previous.x, cell.x, blend) * tile; const y = lerp(previous.y, cell.y, blend) * tile; ctx.fillStyle = gradientColor(index / Math.max(1, state.snake.length - 1)); roundRect(x + 1.5, y + 1.5, tile - 3, tile - 3, tile * .27); ctx.fill(); if (index === 0) drawEyes(x, y); }); }
function drawEyes(x, y) { const eye = tile * .12; ctx.fillStyle = CONFIG.COLORS.cream; const angleX = state.direction.x * tile * .14; const angleY = state.direction.y * tile * .14; [0, 1].forEach(offset => { const side = (offset ? 1 : -1) * tile * .2; ctx.beginPath(); ctx.arc(x + tile / 2 + angleX - (state.direction.y * side), y + tile / 2 + angleY + (state.direction.x * side), eye, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = CONFIG.COLORS.plum; ctx.beginPath(); ctx.arc(x + tile / 2 + angleX - (state.direction.y * side), y + tile / 2 + angleY + (state.direction.x * side), eye * .42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = CONFIG.COLORS.cream; }); }
function drawParticles(now) { state.particles.forEach(particle => { const life = (now - particle.born) / CONFIG.game.particleLife; ctx.globalAlpha = 1 - life; ctx.fillStyle = indexColor(particle.index); ctx.fillRect(particle.x + Math.cos(particle.angle) * life * 25, particle.y + Math.sin(particle.angle) * life * 25, 3, 3); }); ctx.globalAlpha = 1; }

// AUDIO ----------------------------------------------------------------------
function ensureAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(kind) { if (state.mute) return; ensureAudio(); const tones = { eat: [440, .06], golden: [720, .13], power: [560, .1], level: [880, .18], gameover: [130, .28] }; const [frequency, duration] = tones[kind]; const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = frequency; oscillator.type = kind === 'gameover' ? 'sawtooth' : 'sine'; gain.gain.setValueAtTime(.045, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); }

// UI -------------------------------------------------------------------------
function updateHUD(now = performance.now()) { document.getElementById('hud-score').textContent = state.score; document.getElementById('hud-highscore').textContent = highScore(); document.getElementById('hud-level').textContent = `Level ${state.level}`; document.getElementById('hud-combo').textContent = `Combo x${state.combo}`; document.getElementById('hud-length').textContent = `Length ${state.snake.length}`; const progress = Math.min(5, Math.floor((state.score % CONFIG.level.points) / 2)); const levelBar = document.getElementById('hud-level-bar'); levelBar.src = UI_ASSETS[`progress${progress}`]; levelBar.alt = `Level progress, ${progress} of 5`; const powerups = []; if (state.powerups.slow > now) powerups.push(['Slow', state.powerups.slow - now]); if (state.powerups.multiplier > now) powerups.push(['x2 points', state.powerups.multiplier - now]); document.getElementById('hud-powerups').innerHTML = powerups.map(([label, remaining]) => `<span class="powerup-chip">${label} ${Math.ceil(remaining / 1000)}s</span>`).join(''); }
function updateStatus(message) { document.getElementById('status-message').textContent = message; }
function toggleOverlay(id, visible) { document.getElementById(id).classList.toggle('hidden', !visible); }
function showOverlay(id) { toggleOverlay(id, true); }
function hideOverlay(id) { toggleOverlay(id, false); }
function openMenu() { state.running = false; state.paused = false; state.menuOpen = true; hideOverlay('overlay-pause'); hideOverlay('overlay-gameover'); showOverlay('overlay-start'); updateStatus('Choose a run to begin.'); }
function toggleMute() { state.mute = !state.mute; saveStorage(); updateMuteButton(); if (!state.mute) { ensureAudio(); playTone('eat'); } }
function updateMuteButton() { const button = document.getElementById('btn-sound'); button.style.backgroundImage = `url("${state.mute ? UI_ASSETS.sqSoundOff : UI_ASSETS.sqSoundOn}")`; button.setAttribute('aria-label', state.mute ? 'Unmute sound' : 'Mute sound'); button.setAttribute('title', state.mute ? 'Unmute sound' : 'Mute sound'); }
function formatTime(milliseconds) { const seconds = Math.floor(milliseconds / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

// HELPERS --------------------------------------------------------------------
function copyCell(cell) { return { x: cell.x, y: cell.y }; }
function sameCell(a, b) { return a.x === b.x && a.y === b.y; }
function contains(cells, target) { return cells.some(cell => sameCell(cell, target)); }
function isOutside(cell) { return cell.x < 0 || cell.y < 0 || cell.x >= CONFIG.grid.size || cell.y >= CONFIG.grid.size; }
function distance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function neighbors(cell) { return [{ x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }]; }
function lerp(start, end, amount) { return start + (end - start) * amount; }
function gradientColor(amount) { const start = [67, 206, 108]; const end = [17, 166, 54]; return `rgb(${start.map((value, index) => Math.round(value + (end[index] - value) * amount)).join(',')})`; }
function roundRect(x, y, width, height, radius) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
function nextParticleOrigin(food) { return { x: food.x * tile + tile / 2, y: food.y * tile + tile / 2 }; }
function burst(origin) { for (let index = 0; index < CONFIG.game.particles; index += 1) state.particles.push({ ...origin, index, angle: (Math.PI * 2 * index) / CONFIG.game.particles, born: performance.now() }); }
function indexColor(index) { return index % 2 ? CONFIG.COLORS.woodRim : CONFIG.COLORS.particle; }

// BOOT -----------------------------------------------------------------------
function bindUI() {
    document.addEventListener('keydown', handleKey); canvas.addEventListener('touchstart', handleTouchStart, { passive: true }); canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => { state.difficulty = button.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(item => item.classList.toggle('selected', item === button)); saveStorage(); }));
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('selected', item === button)); saveStorage(); }));
    document.getElementById('start-button').addEventListener('click', () => { ensureAudio(); resetGame(); startRun(); }); document.getElementById('restart-button').addEventListener('click', () => { ensureAudio(); resetGame(); startRun(); }); document.getElementById('resume-button').addEventListener('click', togglePause); document.getElementById('menu-button').addEventListener('click', openMenu); document.getElementById('btn-pause').addEventListener('click', togglePause); document.getElementById('btn-restart').addEventListener('click', () => { resetGame(); startRun(); }); document.getElementById('btn-sound').addEventListener('click', toggleMute); document.getElementById('btn-home').addEventListener('click', openMenu); document.getElementById('btn-settings').addEventListener('click', openMenu); document.getElementById('btn-help').addEventListener('click', () => showOverlay('overlay-help'));
    document.getElementById('help-button').addEventListener('click', () => showOverlay('overlay-help')); document.getElementById('close-help-button').addEventListener('click', () => hideOverlay('overlay-help'));
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) togglePause(); });
}

function preloadAssets() { return Promise.all(Object.values(UI_ASSETS).map(source => new Promise(resolve => { const image = new Image(); image.onload = resolve; image.onerror = resolve; image.src = source; }))); }

async function boot() { loadSettings(); bindUI(); setupTouchControls(); updateMuteButton(); resetGame(); document.querySelector(`[data-difficulty="${state.difficulty}"]`).click(); document.querySelector(`[data-mode="${state.mode}"]`).click(); await preloadAssets(); document.getElementById('loading').classList.add('hidden'); document.querySelector('.app-shell').classList.remove('hidden-until-ready'); showOverlay('overlay-start'); requestAnimationFrame(animate); }

boot();