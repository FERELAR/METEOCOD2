
````javascript name=miniGames.js url=https://github.com/FERELAR/METEOCOD_1/blob/main/gameLogic.js
// MINI-GAMES: логика мини-игр, статистики и UI
// Вырезано/адаптировано из original gameLogic.js
// Ожидается, что мета-парсеры (parseMetar, parseMetarFields и т.д.) определены в meteoCoder.js

/* -----------------------
   Mini-games persistent statistics support
   ----------------------- */
let miniStats = {}; // структура: { "find-error": {games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0}, ... }

function loadMiniStats() {
    try {
        miniStats = JSON.parse(localStorage.getItem('miniGameStats') || '{}');
    } catch (e) {
        miniStats = {};
    }
    // ensure keys exist for known games
    const games = ['find-error','guess-code','speed-decode','code-builder','quiz-bowl','taf-predictor','flight-planner'];
    games.forEach(k => {
        if (!miniStats[k]) miniStats[k] = { games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0 };
    });
    localStorage.setItem('miniGameStats', JSON.stringify(miniStats));
    renderMiniStatsForAll();
}

function saveMiniStats() {
    localStorage.setItem('miniGameStats', JSON.stringify(miniStats));
}

function updateMiniStats(gameKey, outcome /*boolean*/, points /*number*/) {
    if (!miniStats[gameKey]) miniStats[gameKey] = { games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0 };
    miniStats[gameKey].games++;
    if (outcome) miniStats[gameKey].wins++;
    miniStats[gameKey].totalPoints += (points || 0);
    miniStats[gameKey].lastPoints = (points || 0);
    if (!miniStats[gameKey].bestPoints || (points || 0) > miniStats[gameKey].bestPoints) miniStats[gameKey].bestPoints = (points || 0);
    saveMiniStats();
    renderMiniStats(gameKey);
}

function renderMiniStats(gameKey) {
    try {
        if (gameKey === 'find-error') {
            const el = document.getElementById('score');
            if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
            const container = document.querySelector('#game-find-error .stats');
            if (container) {
                let info = container.querySelector('.mini-stats');
                if (!info) {
                    info = document.createElement('div');
                    info.className = 'mini-stats';
                    info.style.fontSize = '12px';
                    container.appendChild(info);
                }
                info.textContent = `Игры: ${miniStats[gameKey].games}, Победы: ${miniStats[gameKey].wins}, Всего очков: ${miniStats[gameKey].totalPoints}`;
            }
        } else if (gameKey === 'guess-code') {
            const el = document.getElementById('guess-score'); if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('guess-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'speed-decode') {
            const el = document.getElementById('speed-score'); if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('speed-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'code-builder') {
            const el = document.getElementById('builder-score'); if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('builder-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'quiz-bowl') {
            const el = document.getElementById('quiz-score'); if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('quiz-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'taf-predictor') {
            const el = document.getElementById('taf-score'); if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('taf-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'flight-planner') {
            const el = document.getElementById('planner-score'); if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('planner-level'); if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        }
    } catch(e) { console.warn('renderMiniStats error', e); }
}

function renderMiniStatsForAll() {
    ['find-error','guess-code','speed-decode','code-builder','quiz-bowl','taf-predictor','flight-planner']
        .forEach(k => renderMiniStats(k));
}

/* -----------------------
   Mini-game global reset helper
   ----------------------- */
function resetMiniGame() {
    try { clearInterval(timerInterval); } catch(e){}
    try { clearInterval(builderTimerInterval); } catch(e){}
    const hideIds = ['new-task-speed-decode','new-task-code-builder','new-task-taf-predictor','new-task-quiz-bowl'];
    hideIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    try {
        ['speed-wind','speed-vis','speed-temp','speed-qnh'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.classList.remove('correct-input','incorrect-input'); }
        });
        const speedResult = document.getElementById('speed-result'); if (speedResult) speedResult.innerHTML = '';
    } catch(e){}
    try {
        const pool = document.getElementById('group-pool'); if (pool) pool.innerHTML = '';
        const dz = document.getElementById('builder-dropzone'); if (dz) dz.innerHTML = '';
        const builderResult = document.getElementById('builder-result'); if (builderResult) builderResult.innerHTML = '';
    } catch(e){}
    try {
        const qopts = document.getElementById('quiz-options'); if (qopts) qopts.innerHTML = '';
        const qres = document.getElementById('quiz-result'); if (qres) qres.innerHTML = '';
        const qp = document.getElementById('quiz-progress'); if (qp) qp.textContent = '0/10';
    } catch(e){}
    try {
        const gres = document.getElementById('guess-result'); if (gres) gres.innerHTML = '';
        const ginput = document.getElementById('guess-input'); if (ginput) ginput.value = '';
        const gcheck = document.getElementById('guess-check'); if (gcheck) { gcheck.disabled = false; gcheck.textContent = 'Проверить'; }
    } catch(e){}
    try {
        document.getElementById('planner-result') && (document.getElementById('planner-result').textContent = '');
        document.getElementById('planner-decision') && (document.getElementById('planner-decision').value = '');
        document.getElementById('taf-result') && (document.getElementById('taf-result').textContent = '');
        document.getElementById('taf-answer') && (document.getElementById('taf-answer').value = '');
    } catch(e){}
    try {
        document.querySelectorAll('#meteo-code span').forEach(span => {
            span.style.background = '';
            span.style.color = '';
            span.style.transform = '';
            span.onclick = null;
            span.classList.remove('selected');
        });
        const attemptsEl = document.getElementById('attempts'); if (attemptsEl) attemptsEl.textContent = '3';
        const resultEl = document.getElementById('result'); if (resultEl) resultEl.innerHTML = '';
        const correctGroupsEl = document.getElementById('correct-groups'); if (correctGroupsEl) { correctGroupsEl.style.display = 'none'; correctGroupsEl.innerHTML = ''; }
        const checkBtn = document.getElementById('check-btn'); if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'Проверить'; }
    } catch(e){}
    try {
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display = 'none'; }
    } catch(e){}
}

/* -----------------------
   Статистика и общие переменные мини-игр
   ----------------------- */
let stats = JSON.parse(localStorage.getItem('meteoGameStats') || '{"score":0,"level":1,"games":0,"wins":0}');
function updateStats() {
    document.querySelectorAll('.score').forEach(el => el.textContent = stats.score);
    document.querySelectorAll('.level').forEach(el => el.textContent = stats.level);
    localStorage.setItem('meteoGameStats', JSON.stringify(stats));
    if (stats.score >= stats.level * 150) stats.level++;
}

function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Переменные и функции для игрового селектора и головоломки "find-error"
let mode = 'METAR';
let difficulty = '';
let currentCode = '';
let errors = [];
let selected = new Set();
let attempts = 3;
let hintsLeft = 0;
let currentHint = 1;

// Заглушки для data-структур (на странице/в другом файле должны быть реальные данные)
window.gameData = window.gameData || {
    METAR: { easy: [], medium: [], hard: [] },
    TAF: { easy: [], medium: [], hard: [] },
    GAMET: { easy: [], medium: [], hard: [] },
    SIGMET: { easy: [], medium: [], hard: [] },
    WAREP: { easy: [], medium: [], hard: [] },
    'КН-01': { easy: [], medium: [], hard: [] },
    'КН-04': { easy: [], medium: [], hard: [] },
    AIRMET: { easy: [], medium: [], hard: [] }
};

function initGameSelector() {
    document.querySelectorAll('.game-selector button').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.game-selector button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));
            const gid = 'game-' + this.dataset.game;
            const el = document.getElementById(gid);
            if (el) el.classList.add('active');
            resetMiniGame();
            renderMiniStatsForAll();
        });
    });
}

document.getElementById('btn-metar')?.addEventListener('click', () => { mode = 'METAR'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-taf')?.addEventListener('click', () => { mode = 'TAF'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-gamet')?.addEventListener('click', () => { mode = 'GAMET'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-sigmet')?.addEventListener('click', () => { mode = 'SIGMET'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-warep')?.addEventListener('click', () => { mode = 'WAREP'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-kn01')?.addEventListener('click', () => { mode = 'КН-01'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-kn04')?.addEventListener('click', () => { mode = 'КН-04'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-speci')?.addEventListener('click', () => { mode = 'SPECI'; updateActiveBtn(); if (difficulty) startGame(difficulty); });
document.getElementById('btn-airmet')?.addEventListener('click', () => { mode = 'AIRMET'; updateActiveBtn(); if (difficulty) startGame(difficulty); });

function updateActiveBtn() {
    document.querySelectorAll('.mode-buttons .btn').forEach(b => b.classList.remove('active'));
    const btnId = `btn-${mode.toLowerCase().replace('-', '')}`;
    document.getElementById(btnId)?.classList.add('active');
}

function startGame(diff) {
    resetMiniGame();
    difficulty = diff;
    attempts = 3;
    hintsLeft = (difficulty === 'hard') ? 2 : 1;
    currentHint = 1;
    selected.clear();
    const attemptsEl = document.getElementById('attempts'); if (attemptsEl) attemptsEl.textContent = String(attempts);
    const resultEl = document.getElementById('result'); if (resultEl) resultEl.innerHTML = '';
    const correctGroupsEl = document.getElementById('correct-groups'); if (correctGroupsEl) { correctGroupsEl.style.display = 'none'; correctGroupsEl.innerHTML = ''; }
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) { checkBtn.disabled = false; checkBtn.onclick = checkAnswer; checkBtn.textContent = 'Проверить'; }
    ['new-task-speed-decode','new-task-code-builder','new-task-taf-predictor'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const list = (window.gameData[mode] && window.gameData[mode][diff]) || [{code:'',errors:[]}];
    const item = list[Math.floor(Math.random() * list.length)];
    currentCode = item.code || '';
    errors = item.errors || [];
    displayCode();
    renderMiniStats('find-error');
}

function displayCode() {
    const div = document.getElementById('meteo-code'); if (!div) return;
    div.innerHTML = '';
    const words = (currentCode || '').split(' ').filter(Boolean);
    words.forEach((word, i) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.onclick = () => toggleSelect(span, i);
        div.appendChild(span);
        div.appendChild(document.createTextNode(' '));
    });
    const cg = document.getElementById('correct-groups'); if (cg) { cg.style.display = 'none'; cg.innerHTML = ''; }
    const res = document.getElementById('result'); if (res) res.innerHTML = '';
}

function toggleSelect(span, index) {
    const maxSelect = (difficulty === 'hard') ? 3 : 4;
    if (selected.has(index)) {
        selected.delete(index);
        span.style.background = '';
        span.style.transform = '';
        span.style.color = '';
        span.classList.remove('selected');
    } else if (selected.size < maxSelect) {
        selected.add(index);
        span.style.background = '#f1c40f';
        span.style.transform = 'scale(1.15)';
        span.style.color = 'white';
        span.classList.add('selected');
    }
}

function checkAnswer() {
    if (!currentCode) return;
    const correct = errors.length === selected.size && errors.every(e => selected.has(e));
    document.querySelectorAll('#meteo-code span').forEach((span, i) => {
        if (selected.has(i)) {
            if (errors.includes(i)) {
                span.style.background = '#27ae60';
                span.style.color = 'white';
                span.style.transform = 'scale(1.2)';
                span.onclick = null;
            } else {
                span.style.background = '#e74c3c';
                span.style.color = 'white';
                span.style.transform = 'scale(1.2)';
                span.onclick = null;
                selected.delete(i);
            }
        }
    });
    if (correct) {
        const points = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 40 : 80;
        stats.score += points; stats.wins++; stats.games++;
        if (stats.score >= stats.level * 150) stats.level++;
        updateStats();
        const resEl = document.getElementById('result'); if (resEl) resEl.innerHTML = `<span style="color:#27ae60;font-weight:bold">Правильно! +${points} очков!</span>`;
        const checkBtn = document.getElementById('check-btn'); if (checkBtn) { checkBtn.disabled = true; }
        try { playSound('ding'); } catch(e){}
        try { showConfetti(); } catch(e){}
        updateMiniStats('find-error', true, points);
    } else {
        attempts--;
        const attemptsEl = document.getElementById('attempts'); if (attemptsEl) attemptsEl.textContent = attempts;
        if (attempts === 0) {
            stats.games++;
            localStorage.setItem('meteoGameStats', JSON.stringify(stats));
            const resEl = document.getElementById('result');
            if (resEl) resEl.innerHTML = '<span style="color:#e74c3c;font-weight:bold">Поражение! Правильные группы подсвечены зелёным.</span>';
            document.querySelectorAll('#meteo-code span').forEach((span, i) => {
                span.onclick = null;
                if (errors.includes(i)) {
                    span.style.background = '#27ae60';
                    span.style.color = 'white';
                    span.style.transform = 'scale(1.2)';
                }
            });
            const checkBtn = document.getElementById('check-btn');
            if (checkBtn) { checkBtn.textContent = 'Заново'; checkBtn.onclick = () => startGame(difficulty); }
            try { playSound('buzz'); } catch(e){}
            updateMiniStats('find-error', false, 0);
        } else {
            const resEl = document.getElementById('result');
            if (resEl) resEl.innerHTML = `<span style="color:#e67e22">Неправильно! Осталось попыток: ${attempts}</span>`;
            try { playSound('buzz'); } catch(e){}
        }
    }
    if (attempts === 0 || correct) {
        const item = (window.gameData[mode] && window.gameData[mode][difficulty]) ? window.gameData[mode][difficulty].find(it => it.code === currentCode) : null;
        const hint = item ? (difficulty === 'hard' ? ((item.hint1 || '') + ' / ' + (item.hint2 || '')) : (item.hint || '')) : 'Подсказки нет';
        const correctGroupsEl = document.getElementById('correct-groups');
        if (correctGroupsEl) {
            const words = (currentCode || '').split(' ');
            const correctList = (errors || []).map(idx => `${idx+1}: ${words[idx] || ''}`).join(' • ');
            correctGroupsEl.innerHTML = `<strong>Правильные группы:</strong> ${correctList}<br><em>Подсказка:</em> ${hint}`;
            correctGroupsEl.style.display = 'block';
            correctGroupsEl.className = 'result';
            correctGroupsEl.style.minHeight = 'auto';
        }
    }
}

function showHintFindError() {
    if (hintsLeft > 0) {
        hintsLeft--;
        let hint;
        if (difficulty === 'hard') {
            hint = (window.gameData[mode] && window.gameData[mode][difficulty].find(i => i.code === currentCode)?.[`hint${currentHint}`]) || "Внимательно проверь формат!";
            currentHint = currentHint === 1 ? 2 : 1;
        } else {
            hint = (window.gameData[mode] && window.gameData[mode][difficulty].find(i => i.code === currentCode)?.hint) || "Внимательно проверь формат!";
        }
        const resEl = document.getElementById('result'); if (resEl) resEl.innerHTML = `<span style="color:#e67e22">Подсказка: ${hint}</span>`;
    } else {
        alert("Подсказки закончились!");
    }
}

/* -----------------------
   Guess game (угадай код по описанию)
   ----------------------- */
let currentGuess = null;
const guessGameData = window.guessGameData || { metar: [] };
function startGuessGame() {
    resetMiniGame();
    const list = guessGameData.metar;
    currentGuess = list[Math.floor(Math.random() * Math.max(1,list.length))] || {code:'',desc:''};
    attempts = 3;
    const att = document.getElementById('attempts-guess'); if (att) att.textContent = '3';
    const pd = document.getElementById('phenomenon-desc'); if (pd) pd.textContent = `Явление: ${currentGuess.desc || ''}`;
    const gi = document.getElementById('guess-input'); if (gi) gi.value = '';
    const gr = document.getElementById('guess-result'); if (gr) gr.innerHTML = '';
    const gc = document.getElementById('guess-check'); if (gc) { gc.disabled = false; gc.onclick = checkGuess; }
    renderMiniStats('guess-code');
}

function checkGuess() {
    const userGuess = document.getElementById('guess-input').value.trim().toUpperCase();
    if (userGuess === (currentGuess.code || '').toUpperCase()) {
        const points = 30;
        stats.score += points; stats.wins++; stats.games++;
        if (stats.score >= stats.level * 150) stats.level++;
        updateStats();
        const gr = document.getElementById('guess-result'); if (gr) gr.innerHTML = `<span style="color:#27ae60;font-weight:bold">Правильно! +${points} очков!</span>`;
        const gc = document.getElementById('guess-check'); if (gc) gc.disabled = true;
        try { playSound('ding'); showConfetti(); } catch(e){}
        updateMiniStats('guess-code', true, points);
    } else {
        attempts--;
        const att = document.getElementById('attempts-guess'); if (att) att.textContent = attempts;
        if (attempts === 0) {
            stats.games++; localStorage.setItem('meteoGameStats', JSON.stringify(stats));
            const gr = document.getElementById('guess-result'); if (gr) gr.innerHTML = `<span style="color:#e74c3c;font-weight:bold">Ты проиграл! Правильный код: ${currentGuess.code || ''}</span>`;
            const gc = document.getElementById('guess-check'); if (gc) { gc.textContent = 'Попробовать ещё раз'; gc.onclick = startGuessGame; }
            try { playSound('buzz'); } catch(e){}
            updateMiniStats('guess-code', false, 0);
        } else {
            const gr = document.getElementById('guess-result'); if (gr) gr.innerHTML = `<span style="color:#e67e22">Неправильно! Осталось попыток: ${attempts}</span>`;
            try { playSound('buzz'); } catch(e){}
        }
    }
}

/* -----------------------
   Speed decode
   ----------------------- */
let currentSpeedMetar;
let timerInterval;
let timerSpeeds = {slow: 1.5, normal: 1, fast: 0.5};
let currentTimerSpeed = 'normal';

const speedDecodeData = window.speedDecodeData || ['UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG'];

function startSpeedDecode() {
    resetMiniGame();
    clearInterval(timerInterval);
    const randomMetar = getRandomItem(speedDecodeData);
    const el = document.getElementById('speed-metar'); if (el) el.textContent = randomMetar;
    clearSpeedDecode();
    const res = document.getElementById('speed-result'); if (res) res.innerHTML = '';
    const newBtn = document.getElementById('new-task-speed-decode'); if (newBtn) newBtn.style.display = 'none';
    let timeLeft = Math.ceil(30 * timerSpeeds[currentTimerSpeed]);
    const timerEl = document.getElementById('speed-timer'); if (timerEl) timerEl.textContent = timeLeft;
    timerInterval = setInterval(() => {
        timeLeft--;
        const tEl = document.getElementById('speed-timer'); if (tEl) tEl.textContent = timeLeft;
        if (timeLeft <= 0) { clearInterval(timerInterval); checkSpeedDecode(true); }
    }, 1000);
    currentSpeedMetar = randomMetar;
    renderMiniStats('speed-decode');
}

function checkSpeedDecode(timeout = false) {
    clearInterval(timerInterval);
    const parsed = parseMetarFields(currentSpeedMetar || '');
    const inputs = {
        'speed-wind': document.getElementById('speed-wind').value.trim().toUpperCase() === (parsed.wind || '').toUpperCase(),
        'speed-vis': document.getElementById('speed-vis').value.trim().toUpperCase() === (parsed.vis || '').toUpperCase(),
        'speed-temp': document.getElementById('speed-temp').value.trim().toUpperCase() === (parsed.temp || '').toUpperCase(),
        'speed-qnh': document.getElementById('speed-qnh').value.trim().toUpperCase() === (parsed.qnh || '').toUpperCase()
    };
    let correctCount = 0;
    for (const [id, correct] of Object.entries(inputs)) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.classList.remove('correct-input', 'incorrect-input');
        el.classList.add(correct ? 'correct-input' : 'incorrect-input');
        if (correct) correctCount++;
    }
    if (!timeout && correctCount > 0) {
        stats.score += correctCount * 10;
        updateStats();
        try { playSound('ding'); } catch(e){}
        if (correctCount === 4) try { showConfetti(); } catch(e){}
    } else {
        try { playSound('buzz'); } catch(e){}
    }
    const res = document.getElementById('speed-result'); if (res) res.innerHTML = `Правильно: ${correctCount}/4`;
    if (correctCount === 4) {
        const newBtn = document.getElementById('new-task-speed-decode'); if (newBtn) newBtn.style.display = 'block';
    }
    updateMiniStats('speed-decode', correctCount === 4, correctCount * 10);
}

function clearSpeedDecode() {
    ['speed-wind','speed-vis','speed-temp','speed-qnh'].forEach(id => {
        const el = document.getElementById(id); if (el) { el.value=''; el.classList.remove('correct-input','incorrect-input'); }
    });
}

/* -----------------------
   Code builder (drag/drop)
   ----------------------- */
let currentBuilderCorrect;
let builderTimerInterval;

const codeBuilderData = window.codeBuilderData || [{description:'Соберите METAR', code:'UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG'}];

function startCodeBuilder() {
    resetMiniGame();
    clearInterval(builderTimerInterval);
    const item = getRandomItem(codeBuilderData);
    const descEl = document.getElementById('builder-description'); if (descEl) descEl.textContent = item.description || '';
    const correctGroups = (item.code || '').split(' ').filter(Boolean);
    const extraGroups = ['XXXX', '9999', 'NOSIG', 'CAVOK', 'Q9999', 'M01/M01'];
    const allGroups = [...correctGroups, ...extraGroups.slice(0, 3)].sort(() => Math.random() - 0.5);
    const pool = document.getElementById('group-pool'); if (pool) pool.innerHTML = '';
    document.getElementById('builder-dropzone').innerHTML = '';
    document.getElementById('builder-result').innerHTML = '';
    const newBtn = document.getElementById('new-task-code-builder'); if (newBtn) newBtn.style.display = 'none';
    allGroups.forEach((group, index) => {
        const span = document.createElement('span');
        span.className = 'draggable';
        span.draggable = true;
        span.textContent = group;
        span.id = 'drag-item-' + index;
        span.ondragstart = dragStart;
        pool.appendChild(span);
    });
    currentBuilderCorrect = item.code;
    let timeLeft = Math.ceil(60 * timerSpeeds[currentTimerSpeed]);
    const tEl = document.getElementById('builder-timer'); if (tEl) tEl.textContent = timeLeft;
    builderTimerInterval = setInterval(() => {
        timeLeft--;
        const tEl2 = document.getElementById('builder-timer'); if (tEl2) tEl2.textContent = timeLeft;
        if (timeLeft <= 0) { clearInterval(builderTimerInterval); checkCodeBuilder(true); }
    }, 1000);
    renderMiniStats('code-builder');
}

function checkCodeBuilder(timeout = false) {
    clearInterval(builderTimerInterval);
    const dropzone = document.getElementById('builder-dropzone');
    const userCode = dropzone ? Array.from(dropzone.children).map(span => span.textContent).join(' ') : '';
    if (userCode === (currentBuilderCorrect || '')) {
        const points = timeout ? 0 : 50;
        stats.score += points; updateStats();
        const br = document.getElementById('builder-result'); if (br) br.innerHTML = `<span style="color:#27ae60; font-weight:bold;">Правильно! +${points} очков</span>`;
        try { playSound('ding'); showConfetti(); } catch(e){}
        const newBtn = document.getElementById('new-task-code-builder'); if (newBtn) newBtn.style.display = 'block';
        updateMiniStats('code-builder', true, points);
    } else {
        const br = document.getElementById('builder-result'); if (br) br.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">Неправильно! Проверьте порядок групп и лишние элементы.</span>`;
        try { playSound('buzz'); } catch(e){}
        updateMiniStats('code-builder', false, 0);
    }
}

function dragStart(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.effectAllowed = "move";
}
function allowDrop(ev) { ev.preventDefault(); }
function dropToZone(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const el = document.getElementById(data);
    if (el) document.getElementById('builder-dropzone').appendChild(el);
}
function dropToPool(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const el = document.getElementById(data);
    if (el) document.getElementById('group-pool').appendChild(el);
}
function clearBuilderZone() {
    const dropzone = document.getElementById('builder-dropzone');
    const pool = document.getElementById('group-pool');
    if (!dropzone || !pool) return;
    while (dropzone.firstChild) pool.appendChild(dropzone.firstChild);
    const br = document.getElementById('builder-result'); if (br) br.innerHTML = '';
}

/* -----------------------
   Quiz bowl
   ----------------------- */
let currentQuizCorrect;
let quizProgress = 0;
const quizQuestions = window.quizQuestions || [{question:'Что означает NOSIG?', options:['Нет изменений','Туман','Дождь','Град'], correct:0}];

function startQuizBowl() { resetMiniGame(); quizProgress = 0; nextQuizQuestion(); renderMiniStats('quiz-bowl'); }
function nextQuizQuestion() {
    const item = getRandomItem(quizQuestions);
    document.getElementById('quiz-question').textContent = item.question;
    const optionsDiv = document.getElementById('quiz-options'); optionsDiv.innerHTML = '';
    item.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'quiz-option'; radio.value = idx;
        label.appendChild(radio); label.appendChild(document.createTextNode(opt));
        optionsDiv.appendChild(label);
    });
    document.getElementById('quiz-result').innerHTML = '';
    document.getElementById('quiz-progress').textContent = `${quizProgress + 1}/10`;
    currentQuizCorrect = item.correct;
}

function checkQuiz() {
    const selected = document.querySelector('input[name="quiz-option"]:checked');
    if (selected) {
        if (parseInt(selected.value) === currentQuizCorrect) {
            stats.score += 10; updateStats(); document.getElementById('quiz-result').innerHTML = '<span style="color:#27ae60">Верно!</span>'; try{ playSound('ding'); showConfetti(); }catch(e){}
            updateMiniStats('quiz-bowl', true, 10);
        } else {
            document.getElementById('quiz-result').innerHTML = '<span style="color:#e74c3c">Ошибка!</span>'; try{ playSound('buzz'); }catch(e){}
            updateMiniStats('quiz-bowl', false, 0);
        }
        setTimeout(() => {
            quizProgress++;
            if (quizProgress < 10) nextQuizQuestion();
            else document.getElementById('quiz-result').innerHTML = 'Серия завершена!';
        }, 800);
    }
}

/* -----------------------
   TAF predictor
   ----------------------- */
let currentTafItem;
const tafPredictorData = window.tafPredictorData || [{metar:'', taf:'', question:'', answer:'', points:25}];

function startTafPredictor() {
    resetMiniGame();
    currentTafItem = getRandomItem(tafPredictorData);
    document.getElementById('taf-metar').textContent = currentTafItem.metar || '';
    document.getElementById('taf-taf').textContent = currentTafItem.taf || '';
    document.getElementById('taf-question').textContent = currentTafItem.question || '';
    document.getElementById('taf-answer').value = '';
    document.getElementById('taf-result').textContent = '';
    const newBtn = document.getElementById('new-task-taf-predictor'); if (newBtn) newBtn.style.display = 'none';
    renderMiniStats('taf-predictor');
}

function checkTafPredictor() {
    const userAnswer = document.getElementById('taf-answer').value.trim().toLowerCase();
    if (userAnswer === (currentTafItem.answer || '').toLowerCase()) {
        document.getElementById('taf-result').textContent = 'Правильно!';
        stats.score += 25; updateStats(); try{ playSound('ding'); showConfetti(); }catch(e){}
        const newBtn = document.getElementById('new-task-taf-predictor'); if (newBtn) newBtn.style.display = 'block';
        updateMiniStats('taf-predictor', true, 25);
    } else {
        document.getElementById('taf-result').textContent = 'Неправильно. Правильный ответ: ' + (currentTafItem.answer || '');
        try{ playSound('buzz'); }catch(e){}
        updateMiniStats('taf-predictor', false, 0);
    }
}

/* -----------------------
   Flight planner
   ----------------------- */
let currentPlannerItem;
const flightPlannerData = window.flightPlannerData || [{route:'A-B', expected:'go', points:50}];

function startFlightPlanner() {
    resetMiniGame();
    currentPlannerItem = getRandomItem(flightPlannerData);
    document.getElementById('planner-route').textContent = currentPlannerItem.route || '';
    document.getElementById('planner-decision').value = '';
    document.getElementById('planner-result').textContent = '';
    renderMiniStats('flight-planner');
}

function checkFlightPlanner() {
    const decision = document.getElementById('planner-decision').value;
    if (decision === currentPlannerItem.expected) {
        stats.score += currentPlannerItem.points; updateStats(); document.getElementById('planner-result').textContent = 'Правильно!'; try{ playSound('ding'); showConfetti(); }catch(e){}
        updateMiniStats('flight-planner', true, currentPlannerItem.points);
    } else {
        document.getElementById('planner-result').textContent = 'Неправильно!'; try{ playSound('buzz'); }catch(e){}
        updateMiniStats('flight-planner', false, 0);
    }
}

/* -----------------------
   Подсказки и утилиты
   ----------------------- */
function showHintGuessCode() { alert('Подсказка: Вспомните стандартные коды погоды в METAR.'); }
function showHintSpeedDecode() { alert('Подсказка: Разбейте METAR на группы: ветер, видимость, температура, давление.'); }
function showHintCodeBuilder() { alert('Подсказка: Порядок групп в METAR: аэропорт, время, ветер, видимость, облачность, температура/точка росы, давление.'); }
function showHintQuizBowl() { alert('Подсказка: Ответьте на основе знаний о метеокодах.'); }
function showHintTafPredictor() { alert('Подсказка: Проанализируйте изменения в TAF по сравнению с METAR.'); }
function showHintFlightPlanner() { alert('Подсказка: Оцените погоду по критериям go/no-go.'); }

function playSound(type) {
    const sound = document.getElementById(type + '-sound');
    if (sound && typeof sound.play === 'function') sound.play();
}

function showConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 4 + 1,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 2 - 1
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            p.r *= 0.98;
        });
        if (particles.length && particles[0].r > 0.1) requestAnimationFrame(draw);
        else canvas.style.display = 'none';
    }
    canvas.style.display = 'block';
    draw();
}

/* -----------------------
   Настройки таймера и меню
   ----------------------- */
let currentSettingsGame = '';
function openSettings(game) { currentSettingsGame = game; const sp = document.getElementById('settings-panel'); if (sp) sp.style.display = 'block'; }
function applySettings() {
    const sel = document.getElementById('timer-speed'); if (sel) currentTimerSpeed = sel.value;
    closeSettings();
    if (currentSettingsGame === 'speed-decode') startSpeedDecode();
    if (currentSettingsGame === 'code-builder') startCodeBuilder();
}
function closeSettings() { const sp = document.getElementById('settings-panel'); if (sp) sp.style.display = 'none'; }

function initTopMenu() {
    document.querySelectorAll('.top-menu button').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.disabled) return;
            document.querySelectorAll('.top-menu button').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            this.classList.add('active'); this.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const pageId = 'page-' + this.dataset.page;
            if (document.getElementById(pageId)) document.getElementById(pageId).classList.add('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadMiniStats();
    initTopMenu();
    initGameSelector();
    // render stats for find-error if relevant element exists
    if (document.getElementById('score')) updateStats();
});

try { updateActiveBtn(); } catch(e){}