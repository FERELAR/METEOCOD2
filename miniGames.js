let stats = JSON.parse(localStorage.getItem('meteoGameStats') || '{"score":0,"level":1,"games":0,"wins":0}');
let miniStats = {}; 

function loadMiniStats() {
    try {
        miniStats = JSON.parse(localStorage.getItem('miniGameStats') || '{}');
    } catch (e) {
        miniStats = {};
    }
    const games = ['find-error','guess-code','speed-decode','code-builder','quiz-bowl','taf-predictor','flight-planner'];
    games.forEach(k => {
        if (!miniStats[k]) miniStats[k] = { games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0 };
    });
    localStorage.setItem('miniGameStats', JSON.stringify(miniStats));
    renderMiniStatsForAll();
    renderAllGamesStatsTable();
}

function saveMiniStats() {
    localStorage.setItem('miniGameStats', JSON.stringify(miniStats));
}

function updateMiniStats(gameKey, outcome, points) {
    if (!miniStats[gameKey]) miniStats[gameKey] = { games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0 };
    miniStats[gameKey].games++;
    if (outcome) miniStats[gameKey].wins++;
    miniStats[gameKey].totalPoints += (points || 0);
    miniStats[gameKey].lastPoints = (points || 0);
    if (!miniStats[gameKey].bestPoints || (points || 0) > miniStats[gameKey].bestPoints) miniStats[gameKey].bestPoints = (points || 0);
    saveMiniStats();
    renderMiniStats(gameKey);
    renderAllGamesStatsTable();
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
            const el = document.getElementById('guess-score');
            if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('guess-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'speed-decode') {
            const el = document.getElementById('speed-score');
            if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('speed-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'code-builder') {
            const el = document.getElementById('builder-score');
            if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('builder-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'quiz-bowl') {
            const el = document.getElementById('quiz-score');
            if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('quiz-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'taf-predictor') {
            const el = document.getElementById('taf-score');
            if (el) el.textContent = miniStats[gameKey].totalPoints || 0;
            const lvl = document.getElementById('taf-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        } else if (gameKey === 'flight-planner') {
            const el = document.getElementById('planner-score');
            if (el) el.textContent = miniStats[gameKey].lastPoints || 0;
            const lvl = document.getElementById('planner-level');
            if (lvl) lvl.textContent = Math.max(1, Math.floor((miniStats[gameKey].totalPoints||0)/150) + 1);
        }
    } catch(e) { console.warn('renderMiniStats error', e); }
}

function renderMiniStatsForAll() {
    ['find-error','guess-code','speed-decode','code-builder','quiz-bowl','taf-predictor','flight-planner']
        .forEach(k => renderMiniStats(k));
}

function renderAllGamesStatsTable() {
    const tbody = document.getElementById('all-stats-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const games = [
        {key: 'find-error', name: 'Найди ошибку!'},
        {key: 'guess-code', name: 'Угадай код!'},
        {key: 'speed-decode', name: 'Скоростная расшифровка'},
        {key: 'code-builder', name: 'Собери код'},
        {key: 'quiz-bowl', name: 'Викторина'},
        {key: 'taf-predictor', name: 'Прогнозатор'},
        {key: 'flight-planner', name: 'Flight Planner'}
    ];
    
    games.forEach(game => {
        const stat = miniStats[game.key] || { games:0, wins:0, totalPoints:0, bestPoints:0, lastPoints:0 };
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${game.name}</td>
            <td>${stat.games}</td>
            <td>${stat.wins}</td>
            <td>${stat.totalPoints}</td>
            <td>${stat.bestPoints}</td>
            <td>${stat.lastPoints}</td>
        `;
        
        tbody.appendChild(row);
    });
}

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
        document.getElementById('quiz-progress') && (document.getElementById('quiz-progress').textContent = '0/10');
    } catch(e){}
    try {
        const gres = document.getElementById('guess-result'); if (gres) gres.innerHTML = '';
        const ginput = document.getElementById('guess-input'); if (ginput) ginput.value = '';
        document.getElementById('guess-check') && (document.getElementById('guess-check').disabled = false);
        document.getElementById('guess-check') && (document.getElementById('guess-check').textContent = 'Проверить');
    } catch(e){}
    try {
        document.querySelector('#planner-result') && (document.querySelector('#planner-result').textContent = '');
        document.querySelector('#planner-decision') && (document.querySelector('#planner-decision').value = '');
        document.querySelector('#taf-result') && (document.querySelector('#taf-result').textContent = '');
        document.querySelector('#taf-answer') && (document.querySelector('#taf-answer').value = '');
    } catch(e){}
    try {
        document.querySelectorAll('#meteo-code span').forEach(span => {
            span.style.background = '';
            span.style.color = '';
            span.style.transform = '';
            span.onclick = () => { 
                const idxAttr = Array.prototype.indexOf.call(span.parentNode.childNodes, span) / 2;
            };
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
    const animContainer = document.getElementById('animation-container');
    if (animContainer) {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => reel.textContent = '');
    const slotResult = document.getElementById('slot-result');
    if (slotResult) slotResult.textContent = '';
    const lever = document.getElementById('lever');
    if (lever) lever.disabled = false;
    
    // Очистка областей подсказок
    document.querySelectorAll('.hint-area').forEach(area => {
        area.innerHTML = '';
    });
}

function updateStats() {
    document.querySelectorAll('.score').forEach(el => el.textContent = stats.score);
    document.querySelectorAll('.level').forEach(el => el.textContent = stats.level);
    localStorage.setItem('meteoGameStats', JSON.stringify(stats));
    if (stats.score >= stats.level * 150) stats.level++;
}

function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let mode = 'METAR';
let difficulty = '';
let currentCode = '';
let errors = [];
let selected = new Set();
let attempts = 3;
let hintsLeft = 0;
let currentHint = 1;
let guessMode = 'metar';
let currentGuess = null;

function initGameSelector() {
    document.querySelectorAll('.game-selector button').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.game-selector button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));
            document.getElementById('game-' + this.dataset.game).classList.add('active');
            resetMiniGame();
            renderMiniStatsForAll();
            if (this.dataset.game === 'weather-slot') {
                document.getElementById('lever').onclick = startSlotMachine;
            }
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
    const attemptsEl = document.getElementById('attempts');
    if (attemptsEl) attemptsEl.textContent = String(attempts);
    const resultEl = document.getElementById('result'); if (resultEl) resultEl.innerHTML = '';
    const correctGroupsEl = document.getElementById('correct-groups'); if (correctGroupsEl) { correctGroupsEl.style.display = 'none'; correctGroupsEl.innerHTML = ''; }
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.onclick = checkAnswer;
        checkBtn.textContent = 'Проверить';
    }
    ['new-task-speed-decode','new-task-code-builder','new-task-taf-predictor'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const list = gameData[mode][diff];
    const item = list[Math.floor(Math.random() * list.length)];
    currentCode = item.code;
    errors = item.errors;
    displayCode();
    renderMiniStats('find-error');
}

function displayCode() {
    const div = document.getElementById('meteo-code');
    div.innerHTML = '';
    const words = currentCode.split(' ');
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
        stats.score += points;
        stats.wins++;
        stats.games++;
        if (stats.score >= stats.level * 150) stats.level++;
        updateStats();
        document.getElementById('result').innerHTML = `<span style="color:#27ae60;font-weight:bold">Правильно! +${points} очков!</span>`;
        document.getElementById('check-btn').disabled = true;
        playSound('ding');
        showConfetti();
        updateMiniStats('find-error', true, points);
    } else {
        attempts--;
        document.getElementById('attempts').textContent = attempts;
        if (attempts === 0) {
            stats.games++;
            localStorage.setItem('meteoGameStats', JSON.stringify(stats));
            document.getElementById('result').innerHTML = '<span style="color:#e74c3c;font-weight:bold">Поражение! Правильные группы подсвечены зелёным.</span>';
            document.querySelectorAll('#meteo-code span').forEach((span, i) => {
                span.onclick = null;
                if (errors.includes(i)) {
                    span.style.background = '#27ae60';
                    span.style.color = 'white';
                    span.style.transform = 'scale(1.2)';
                }
            });
            document.getElementById('check-btn').textContent = 'Заново';
            document.getElementById('check-btn').onclick = () => startGame(difficulty);
            playSound('buzz');
            updateMiniStats('find-error', false, 0);
        } else {
            document.getElementById('result').innerHTML = `<span style="color:#e67e22">Неправильно! Осталось попыток: ${attempts}</span>`;
            playSound('buzz');
        }
    }
    if (attempts === 0 || correct) {
        const item = gameData[mode][difficulty].find(it => it.code === currentCode);
        const hint = item ? (difficulty === 'hard' ? (item.hint1 + ' / ' + item.hint2) : item.hint) : 'Ошибка в формате';
        const correctGroupsEl = document.getElementById('correct-groups');
        if (correctGroupsEl) {
            const words = currentCode.split(' ');
            const correctList = errors.map(idx => `${idx+1}: ${words[idx] || ''}`).join(' • ');
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
            hint = gameData[mode][difficulty].find(i => i.code === currentCode)?.[`hint${currentHint}`] || "Внимательно проверь формат!";
            currentHint = currentHint === 1 ? 2 : 1;
        } else {
            hint = gameData[mode][difficulty].find(i => i.code === currentCode)?.hint || "Внимательно проверь формат!";
        }
        document.getElementById('find-error-hint').innerHTML = `<span style="color:#e67e22">Подсказка: ${hint}</span>`;
    } else {
        alert("Подсказки закончились!");
    }
}

function startGuessGame() {
    resetMiniGame();
    const list = guessGameData.metar;
    currentGuess = list[Math.floor(Math.random() * list.length)];
    attempts = 3;
    document.getElementById('attempts-guess').textContent = '3';
    document.getElementById('phenomenon-desc').textContent = `Явление: ${currentGuess.desc}`;
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-result').innerHTML = '';
    document.getElementById('guess-check').disabled = false;
    document.getElementById('guess-check').onclick = checkGuess;
    renderMiniStats('guess-code');
}

function checkGuess() {
    const userGuess = document.getElementById('guess-input').value.trim().toUpperCase();
    const inputEl = document.getElementById('guess-input');
    if (userGuess === currentGuess.code) {
        const points = 30;
        stats.score += points;
        stats.wins++;
        stats.games++;
        if (stats.score >= stats.level * 150) stats.level++;
        updateStats();
        document.getElementById('guess-result').innerHTML = `<span style="color:#27ae60;font-weight:bold">Правильно! +${points} очков!</span>`;
        document.getElementById('guess-check').disabled = true;
        playSound('ding');
        showConfetti();
        updateMiniStats('guess-code', true, points);
    } else {
        attempts--;
        document.getElementById('attempts-guess').textContent = attempts;
        inputEl.classList.add('shake');
        setTimeout(() => inputEl.classList.remove('shake'), 500);
        if (attempts === 0) {
            stats.games++;
            localStorage.setItem('meteoGameStats', JSON.stringify(stats));
            document.getElementById('guess-result').innerHTML = '<span style="color:#e74c3c;font-weight:bold">Ты проиграл! Правильный код: ' + currentGuess.code + '</span>';
            document.getElementById('guess-check').textContent = 'Попробовать ещё раз';
            document.getElementById('guess-check').onclick = startGuessGame;
            playSound('buzz');
            updateMiniStats('guess-code', false, 0);
        } else {
            document.getElementById('guess-result').innerHTML = `<span style="color:#e67e22">Неправильно! Осталось попыток: ${attempts}</span>`;
            playSound('buzz');
        }
    }
}

let currentSpeedMetar;
let timerInterval;
let timerSpeeds = {slow: 1.5, normal: 1, fast: 0.5};
let currentTimerSpeed = 'normal';

function startSpeedDecode() {
    resetMiniGame();
    clearInterval(timerInterval);
    const randomMetar = getRandomItem(speedDecodeData);
    document.getElementById('speed-metar').textContent = randomMetar;
    clearSpeedDecode();
    document.getElementById('speed-result').innerHTML = '';
    document.getElementById('new-task-speed-decode').style.display = 'none';
    let timeLeft = 30 * timerSpeeds[currentTimerSpeed];
    document.getElementById('speed-timer').textContent = Math.ceil(timeLeft);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('speed-timer').textContent = Math.ceil(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            checkSpeedDecode(true);
        }
    }, 1000);
    currentSpeedMetar = randomMetar;
    renderMiniStats('speed-decode');
}

function checkSpeedDecode(timeout = false) {
    clearInterval(timerInterval);
    const parsed = parseMetarFields(currentSpeedMetar);
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
        if (!correct) {
            el.classList.add('shake');
            setTimeout(() => el.classList.remove('shake'), 500);
        }
        if (correct) correctCount++;
    }
    if (!timeout && correctCount > 0) {
        stats.score += correctCount * 10;
        updateStats();
        playSound('ding');
        if (correctCount === 4) showConfetti();
    } else {
        playSound('buzz');
    }
    document.getElementById('speed-result').innerHTML = `Правильно: ${correctCount}/4`;
    if (correctCount === 4) {
        document.getElementById('new-task-speed-decode').style.display = 'block';
    }
    updateMiniStats('speed-decode', correctCount === 4, correctCount * 10);
}

function clearSpeedDecode() {
    document.getElementById('speed-wind').value = '';
    document.getElementById('speed-vis').value = '';
    document.getElementById('speed-temp').value = '';
    document.getElementById('speed-qnh').value = '';
    ['speed-wind','speed-vis','speed-temp','speed-qnh'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('correct-input','incorrect-input');
    });
}

let currentBuilderCorrect;
let builderTimerInterval;

function startCodeBuilder() {
    resetMiniGame();
    clearInterval(builderTimerInterval);
    const item = getRandomItem(codeBuilderData);
    document.getElementById('builder-description').textContent = item.description;
    const correctGroups = item.code.split(' ');
    const extraGroups = ['XXXX', '9999', 'NOSIG', 'CAVOK', 'Q9999', 'M01/M01'];
    const allGroups = [...correctGroups, ...extraGroups.slice(0, 3)].sort(() => Math.random() - 0.5);
    const pool = document.getElementById('group-pool');
    pool.innerHTML = '';
    document.getElementById('builder-dropzone').innerHTML = '';
    document.getElementById('builder-result').innerHTML = '';
    document.getElementById('new-task-code-builder').style.display = 'none';
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
    let timeLeft = 120 * timerSpeeds[currentTimerSpeed];
    document.getElementById('builder-timer').textContent = Math.ceil(timeLeft);
    builderTimerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('builder-timer').textContent = Math.ceil(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(builderTimerInterval);
            checkCodeBuilder(true);
        }
    }, 1000);
    renderMiniStats('code-builder');
}

function checkCodeBuilder(timeout = false) {
    clearInterval(builderTimerInterval);
    const dropzone = document.getElementById('builder-dropzone');
    const userCode = Array.from(dropzone.children).map(span => span.textContent).join(' ');
    const resultEl = document.getElementById('builder-result');
    if (userCode === currentBuilderCorrect) {
        const points = timeout ? 0 : 50;
        stats.score += points;
        updateStats();
        resultEl.innerHTML = `<span style="color:#27ae60; font-weight:bold;">Правильно! +${points} очков</span>`;
        playSound('ding');
        showConfetti();
        document.getElementById('new-task-code-builder').style.display = 'block';
        updateMiniStats('code-builder', true, points);
    } else {
        resultEl.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">Неправильно! (Лишние группы или неправильный порядок)</span>`;
        resultEl.classList.add('shake');
        setTimeout(() => resultEl.classList.remove('shake'), 500);
        playSound('buzz');
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
    while (dropzone.firstChild) pool.appendChild(dropzone.firstChild);
    document.getElementById('builder-result').innerHTML = '';
}

let currentQuizCorrect;
let quizProgress = 0;

function startQuizBowl() { resetMiniGame(); quizProgress = 0; nextQuizQuestion(); renderMiniStats('quiz-bowl'); }

function nextQuizQuestion() {
    const item = getRandomItem(quizQuestions);
    document.getElementById('quiz-question').textContent = item.question;
    const optionsDiv = document.getElementById('quiz-options');
    optionsDiv.innerHTML = '';
    item.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-option';
        radio.value = idx;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        optionsDiv.appendChild(label);
    });
    document.getElementById('quiz-result').innerHTML = '';
    document.getElementById('quiz-progress').textContent = `${quizProgress + 1}/10`;
    currentQuizCorrect = item.correct;
}

function checkQuiz() {
    const selected = document.querySelector('input[name="quiz-option"]:checked');
    const resultEl = document.getElementById('quiz-result');
    if (selected) {
        if (parseInt(selected.value) === currentQuizCorrect) {
            stats.score += 10; updateStats(); resultEl.innerHTML = '<span style="color:#27ae60">Верно!</span>'; playSound('ding'); showConfetti();
            updateMiniStats('quiz-bowl', true, 10);
        } else { resultEl.innerHTML = '<span style="color:#e74c3c">Ошибка!</span>'; 
        resultEl.classList.add('shake');
        setTimeout(() => resultEl.classList.remove('shake'), 500); 
        playSound('buzz'); updateMiniStats('quiz-bowl', false, 0); }
        setTimeout(() => {
            quizProgress++;
            if (quizProgress < 10) nextQuizQuestion();
            else document.getElementById('quiz-result').innerHTML = 'Серия завершена!';
        }, 1000);
    }
}

let currentTafItem;

function startTafPredictor() {
    resetMiniGame();
    currentTafItem = getRandomItem(tafPredictorData);
    document.getElementById('taf-metar').textContent = currentTafItem.metar;
    document.getElementById('taf-taf').textContent = currentTafItem.taf;
    document.getElementById('taf-question').textContent = currentTafItem.question;
    document.getElementById('taf-answer').value = '';
    document.getElementById('taf-result').textContent = '';
    document.getElementById('new-task-taf-predictor').style.display = 'none';
    renderMiniStats('taf-predictor');
}

function checkTafPredictor() {
    const userAnswer = document.getElementById('taf-answer').value.trim().toLowerCase();
    const resultEl = document.getElementById('taf-result');
    const inputEl = document.getElementById('taf-answer');
    if (userAnswer === currentTafItem.answer.toLowerCase()) {
        resultEl.textContent = 'Правильно!';
        stats.score += 25; updateStats(); playSound('ding'); showConfetti();
        document.getElementById('new-task-taf-predictor').style.display = 'block';
        updateMiniStats('taf-predictor', true, 25);
    } else {
        resultEl.textContent = 'Неправильно. Правильный ответ: ' + currentTafItem.answer;
        inputEl.classList.add('shake');
        setTimeout(() => inputEl.classList.remove('shake'), 500);
        playSound('buzz');
        updateMiniStats('taf-predictor', false, 0);
    }
}

let currentPlannerItem;

function startFlightPlanner() {
    resetMiniGame();
    currentPlannerItem = getRandomItem(flightPlannerData);
    document.getElementById('planner-route').textContent = currentPlannerItem.route;
    document.getElementById('planner-decision').value = '';
    document.getElementById('planner-result').textContent = '';
    renderMiniStats('flight-planner');
}

function checkFlightPlanner() {
    const decision = document.getElementById('planner-decision').value;
    const resultEl = document.getElementById('planner-result');
    if (decision === currentPlannerItem.expected) {
        stats.score += currentPlannerItem.points; updateStats(); resultEl.textContent = 'Правильно!'; playSound('ding'); showConfetti();
        updateMiniStats('flight-planner', true, currentPlannerItem.points);
    } else { resultEl.textContent = 'Неправильно!'; 
    resultEl.classList.add('shake');
    setTimeout(() => resultEl.classList.remove('shake'), 500); 
    playSound('buzz'); updateMiniStats('flight-planner', false, 0); }
}

function showHintGuessCode() { 
    document.getElementById('guess-code-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Вспомните стандартные коды погоды в METAR.</span>'; 
}

function showHintSpeedDecode() { 
    document.getElementById('speed-decode-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Разбейте METAR на группы: ветер, видимость, температура, давление.</span>'; 
}

function showHintCodeBuilder() { 
    document.getElementById('code-builder-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Порядок групп в METAR: аэропорт, время, ветер, видимость, облачность, температура, давление.</span>'; 
}

function showHintQuizBowl() { 
    document.getElementById('quiz-bowl-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Ответьте на основе знаний о метеокодах.</span>'; 
}

function showHintTafPredictor() { 
    document.getElementById('taf-predictor-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Проанализируйте изменения в TAF по сравнению с METAR.</span>'; 
}

function showHintFlightPlanner() { 
    document.getElementById('flight-planner-hint').innerHTML = '<span style="color:#e67e22">Подсказка: Оцените погоду по критериям go/no-go.</span>'; 
}

function playSound(type) {
    if (!appSettings.animations) return;
    const sound = document.getElementById(type + '-sound');
    if (sound) sound.play();
}

function showConfetti() {
    if (!appSettings.animations) return;
    const canvas = document.getElementById('confetti-canvas');
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
        if (particles[0].r > 0.1) requestAnimationFrame(draw);
        else canvas.style.display = 'none';
    }
    canvas.style.display = 'block';
    draw();
}

let currentSettingsGame = '';

function openSettings(game) { currentSettingsGame = game; document.getElementById('settings-panel').style.display = 'block'; }

function applyTimerSettings() {
    currentTimerSpeed = document.getElementById('timer-speed').value;
    closeSettings();
    if (currentSettingsGame === 'speed-decode') startSpeedDecode();
    if (currentSettingsGame === 'code-builder') startCodeBuilder();
}

function closeSettings() { 
    document.getElementById('settings-panel').style.display = 'none'; 
}

function closeSettings() { document.getElementById('settings-panel').style.display = 'none'; }

function startSlotMachine() {
    resetMiniGame();
    const lever = document.getElementById('lever');
    lever.disabled = true;
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        reel.classList.add('spinning');
        reel.textContent = '';
    });
    setTimeout(() => {
        const symbols = ['❄️', '☀️', '🌧️'];
        const result = Array.from({length: 3}, () => symbols[Math.floor(Math.random() * symbols.length)]);
        reels.forEach((reel, i) => {
            reel.textContent = result[i];
            reel.classList.remove('spinning');
        });
        const animContainer = document.getElementById('animation-container');
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
        let message = '';
        if (result.every(s => s === '❄️')) {
            message = 'Синоптики прогнозируют местами снег и морозы.';
            snowAnimation();
        } else if (result.every(s => s === '☀️')) {
            message = 'Синоптики прогнозируют тепло, солнце и радость';
            sunAnimation();
        } else if (result.every(s => s === '🌧️')) {
            message = 'Синоптики прогнозируют местами дождь и депрессию';
            rainAnimation();
        } else {
            message = 'Прогноз не задался. Попробовать ещё раз или уйти в шаманизм, танцы с бубнами?';
        }
        document.getElementById('slot-result').textContent = message;
        lever.disabled = false;
    }, 1000);
}

function snowAnimation() {
    if (!appSettings.animations) return;
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    for (let i = 0; i < 100; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDuration = `${Math.random() * 3 + 8}s`;
        flake.style.animationDelay = `${Math.random() * 2}s`;
        flake.style.width = `${Math.random() * 5 + 5}px`;
        flake.style.height = flake.style.width;
        animContainer.appendChild(flake);
    }
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 8000);
}

function rainAnimation() {
    if (!appSettings.animations) return;
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDuration = `${Math.random() * 1 + 8}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        animContainer.appendChild(drop);
    }
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 4000);
}

function sunAnimation() {
    if (!appSettings.animations) return;
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    const sun = document.createElement('div');
    sun.className = 'sun';
    animContainer.appendChild(sun);
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 8000);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadMiniStats();
    initGameSelector();
    if (document.getElementById('score')) updateStats();

});
