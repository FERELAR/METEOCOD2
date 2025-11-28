let currentEncodeExercise = null;
let trainerStats = JSON.parse(localStorage.getItem('trainerStats') || '{"level":1,"totalDecoded":0,"correctDecoded":0,"sessionDecoded":0,"sessionCorrect":0,"errorsByType":{"metar":0,"kn01":0,"taf":0,"gamet":0,"sigmet":0,"warep":0,"kn04":0,"airmet":0}}');
let currentPracticeCode = null;
let hintStep = 0;
function parseMetar(metar) {
    try {
        const parts = metar.trim().toUpperCase().replace(/=+$/,'').split(/\s+/);
        let i = 0;
        const out = [];
        if (parts[i] === 'METAR' || parts[i] === 'SPECI') { out.push(`Тип: ${parts[i]}`); i++; }
        if (/^[A-Z]{4}$/.test(parts[i])) {
            out.push(`Аэродром: ${parts[i]}`);
            i++;
        } else {
            out.push('Ошибка: Неверный код аэродрома');
        }
        if (/^\d{6}Z$/.test(parts[i])) {
            const d = parts[i];
            out.push(`Время наблюдения: ${d.slice(0,2)} число, ${d.slice(2,4)}:${d.slice(4,6)} UTC`);
            i++;
        } else {
            out.push('Ошибка: Неверный формат времени');
        }
        if (parts[i] === 'AUTO') { out.push('Отчёт автоматический'); i++; }
        if (parts[i] === 'COR') { out.push('Отчёт исправленный'); i++; }
        const windRe = /^(VRB|\d{3}|\/\/\/)(\d{2,3})(G(\d{2,3}))?(KT|MPS|KMH)$/;
        if (windRe.test(parts[i])) {
            const m = parts[i].match(windRe);
            const dir = m[1] === 'VRB' ? 'переменного направления' : m[1] === '000' ? 'штиль' : `${m[1]}°`;
            const speed = m[2];
            const gust = m[4] ? `, порывы до ${m[4]} ${m[5]}` : '';
            const unit = m[5] === 'KT' ? 'узлов' : m[5] === 'MPS' ? 'м/с' : 'км/ч';
            out.push(`Ветер: ${dir}, ${speed} ${unit}${gust}`);
            i++;
        } else if (parts[i]) {
            out.push('Ошибка: Неверный формат ветра');
            i++;
        }
        if (/^\d{3}V\d{3}$/.test(parts[i])) {
            out.push(`Изменение направления ветра: от ${parts[i].slice(0,3)}° до ${parts[i].slice(5,8)}°`);
            i++;
        }
        if (parts[i] === 'CAVOK') {
            out.push('CAVOK — видимость ≥10 км, нет значимой погоды и облачности ниже 1500 м (5000 ft), нет CB/TCU');
            i++;
        } else if (/^\d{4}$/.test(parts[i])) {
            out.push(`Преобладающая видимость: ${parseInt(parts[i])} метров`);
            i++;
        } else if (parts[i]) {
            out.push('Ошибка: Неверный формат видимости');
            i++;
        }
        while (/^R\d{2}[LCR]?\/.*/.test(parts[i])) {
            const rvr = parts[i].match(/^R(\d{2}[LCR]?)\/(P|M)?(\d{4})(V(\d{4}))?(U|D|N)?$/);
            if (rvr) {
                let vis = rvr[3];
                const prefix = rvr[2] === 'P' ? 'более ' : rvr[2] === 'M' ? 'менее ' : '';
                const varVis = rvr[5] ? ` изменяется до ${rvr[5]}` : '';
                const trend = rvr[6] === 'U' ? ' улучшается' : rvr[6] === 'D' ? ' ухудшается' : rvr[6] === 'N' ? ' без изменений' : '';
                out.push(`RVR на ВПП ${rvr[1]}: ${prefix}${vis} м${varVis}${trend}`);
            } else {
                out.push(`Дальность видимости на ВПП: ${parts[i]}`);
            }
            i++;
        }
        while (/^[+-]?(VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP)?(BR|FG|FU|VA|DU|SA|HZ|PY)?(PO|SQ|FC|SS|DS)?$/.test(parts[i])) {
            let code = parts[i];
            let intensity = code[0] === '+' ? 'сильный ' : code[0] === '-' ? 'слабый ' : '';
            if ('+-'.includes(code[0])) code = code.slice(1);
            let descr = '', precip = '', obsc = '', other = '';
            if (code.startsWith('VC')) { descr += 'в окрестностях '; code = code.slice(2); }
            for (const key of ['MI','BC','PR','DR','BL','SH','TS','FZ']) if (code.startsWith(key)) { descr += WEATHER_CODES[key] + ' '; code = code.slice(key.length); }
            for (const key of ['DZ','RA','SN','SG','IC','PL','GR','GS','UP']) if (code.startsWith(key)) { precip += WEATHER_CODES[key] + ' '; code = code.slice(key.length); }
            for (const key of ['BR','FG','FU','VA','DU','SA','HZ','PY']) if (code.startsWith(key)) { obsc += WEATHER_CODES[key] + ' '; code = code.slice(key.length); }
            for (const key of ['PO','SQ','FC','SS','DS']) if (code.startsWith(key)) { other += WEATHER_CODES[key] + ' '; code = code.slice(key.length); }
            if (code) out.push('Ошибка: Неизвестный код погоды ' + parts[i]);
            else out.push(`Текущая погода: ${intensity}${descr}${precip}${obsc}${other}`.trim());
            i++;
        }
        while (/^(FEW|SCT|BKN|OVC|NSC|SKC|CLR|\/\/\/)\d{3}(CB|TCU|\/\/\/)?$/.test(parts[i]) || /^VV\d{3}$/.test(parts[i])) {
            if (/^VV\d{3}$/.test(parts[i])) {
                out.push(`Вертикальная видимость: ${parseInt(parts[i].slice(2))*30} м`);
                i++;
                continue;
            }
            const m = parts[i].match(/^(FEW|SCT|BKN|OVC|NSC|SKC|CLR|\/\/\/)(\d{3}|\/\/\/)(CB|TCU|\/\/\/)?$/);
            const cov = CLOUD_TYPES[m[1]] || m[1];
            const height = m[2] === '///' ? '' : `${parseInt(m[2])*30} м (${parseInt(m[2])*100} футов)`;
            const type = m[3] && m[3] !== '///' ? CLOUD_SUFFIX[m[3]] : '';
            out.push(`Облачность: ${cov}${height ? ', высота ' + height : ''}${type ? ', ' + type : ''}`);
            i++;
        }
        if (/^(M?\d{2})\/(M?\d{2})$/.test(parts[i])) {
            let [t, td] = parts[i].split('/');
            t = t.startsWith('M') ? '-' + t.slice(1) : t;
            td = td.startsWith('M') ? '-' + td.slice(1) : td;
            out.push(`Температура воздуха: ${t}°C, точка росы: ${td}°C`);
            i++;
        } else if (parts[i]) {
            out.push('Ошибка: Неверный формат температуры');
            i++;
        }
        if (/^[QA]\d{4}$/.test(parts[i])) {
            if (parts[i].startsWith('Q')) {
                out.push(`Давление QNH: ${parts[i].slice(1)} гПа`);
            } else {
                const inches = parts[i].slice(1,3) + '.' + parts[i].slice(3);
                out.push(`Давление: ${inches} дюймов рт. ст.`);
            }
            i++;
        } else if (parts[i]) {
            out.push('Ошибка: Неверный формат давления');
            i++;
        }
        while (i < parts.length) {
            if (parts[i].startsWith('RE')) {
                out.push(`Недавняя погода: ${parseWeather(parts[i].slice(2))}`);
                i++;
            } else if (parts[i].startsWith('WS')) {
                out.push(`Сдвиг ветра: ${parts[i]}`);
                i++;
            } else if (parts[i] === 'RMK') {
                out.push(`Замечания: ${parts.slice(i+1).join(' ')}`);
                break;
            } else {
                out.push(`Тренд или дополнительно: ${parts[i]}`);
                i++;
            }
        }
        return out.join('\n');
    } catch (e) {
        return 'Ошибка парсинга METAR: ' + e.message;
    }
}
function parseWeather(code) {
    return code.split(/(?=[A-Z]{2})/).map(c => WEATHER_CODES[c] || c).join(' ');
}
function parseMetarFields(metar) {
    const parts = metar.trim().toUpperCase().replace(/=+$/,'').split(/\s+/);
    const out = { wind: '', vis: '', temp: '', qnh: '' };
    for (let i = 0; i < parts.length; i++) {
        if (/^(VRB|\d{3}|\/\/\/)\d{2,3}(G\d{2,3})?(KT|MPS|KMH)$/.test(parts[i])) {
            out.wind = parts[i];
            continue;
        }
    }
    const visMatch = parts.find(p => p === 'CAVOK' || /^\d{4}$/.test(p));
    out.vis = visMatch || '';
    const tempMatch = parts.find(p => /^(M?\d{2})\/(M?\d{2})$/.test(p));
    out.temp = tempMatch || '';
    const qMatch = parts.find(p => /^[QA]\d{4}$/.test(p));
    out.qnh = qMatch || '';
    return out;
}
function parseTaf(taf) {
    try {
        const parts = taf.trim().toUpperCase().split(/\s+/);
        let i = 0;
        const out = ['Прогноз погоды по аэродрому (TAF)'];
        if (parts[i] === 'TAF') i++;
        if (parts[i] === 'AMD' || parts[i] === 'COR') { out.push(`Статус: ${parts[i] === 'AMD' ? 'исправленный' : 'корректированный'}`); i++; }
        if (/^[A-Z]{4}$/.test(parts[i])) { out.push(`Аэродром: ${parts[i]}`); i++; }
        if (/^\d{6}Z/.test(parts[i])) {
            const d = parts[i];
            out.push(`Выпущен: ${d.slice(0,2)} число, ${d.slice(2,4)}:${d.slice(4,6)} UTC`);
            i++;
        }
        if (/^\d{4}\/\d{4}$/.test(parts[i])) {
            const [from, to] = parts[i].split('/');
            out.push(`Действует: с ${from.slice(0,2)} ${from.slice(2)}:00 до ${to.slice(0,2)} ${to.slice(2)}:00 UTC`);
            i++;
        }
        let temp = [];
        while (i < parts.length && !['FM','TEMPO','BECMG','PROB30','PROB40'].includes(parts[i])) {
            temp.push(parts[i++]);
        }
        out.push('Основной прогноз:');
        out.push(parseMetar(temp.join(' ')));
        while (i < parts.length) {
            let line = '';
            let prob = '';
            if (parts[i].startsWith('PROB')) {
                prob = parts[i] + ' вероятность ';
                i++;
            }
            const type = parts[i++];
            if (type === 'FM') {
                const time = parts[i++];
                line += `${prob}С ${time.slice(0,2)} числа ${time.slice(2,4)}:${time.slice(4,6)} UTC: `;
            } else if (type === 'TEMPO' || type === 'BECMG') {
                const period = parts[i++];
                const [f,t] = period.split('/');
                line += `${prob}${type === 'TEMPO' ? 'Временно' : 'Становясь'} с ${f.slice(0,2)} ${f.slice(2)}:00 до ${t.slice(0,2)} ${t.slice(2)}:00: `;
            }
            temp = [];
            while (i < parts.length && !['FM','TEMPO','BECMG','PROB30','PROB40'].includes(parts[i])) {
                temp.push(parts[i++]);
            }
            out.push(line);
            out.push(parseMetar(temp.join(' ')));
        }
        return out.join('\n');
    } catch (e) {
        return 'Ошибка парсинга TAF: ' + e.message;
    }
}
function parseKn01(kn01) {
    try {
        const groups = kn01.split(/\s+/);
        if (groups.length < 10) return 'Ошибка: Недостаточно групп в KN-01';
        let decoded = '';
        let i = 0;
        decoded += `• Станция: ${groups[i++]}\n`;
        decoded += `• Тип: ${groups[i++]}\n`;
        decoded += `• Облачность малая: ${groups[i++]}\n`;
        decoded += `• Облачность средняя/верхняя: ${groups[i++]}\n`;
        decoded += `• Нижняя облачность: ${groups[i++]}\n`;
        decoded += `• Давление на уровне станции: ${groups[i++]}\n`;
        decoded += `• Тенденция давления: ${groups[i++]}\n`;
        decoded += `• Осадки за 6 ч: ${groups[i++]}\n`;
        decoded += `• Осадки за 3 ч: ${groups[i++]}\n`;
        decoded += `• Погода в срок и между сроками: ${groups[i++]}\n`;
        while (i < groups.length) {
            decoded += `• Дополнительно: ${groups[i++]}\n`;
        }
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга KN-01: ' + e.message;
    }
}
function parseGamet(gamet) {
    try {
        const sections = gamet.split(/SEC\s+I:/);
        let decoded = '';
        decoded += '• Секция I: Опасности\n' + (sections[1] ? sections[1] : 'Нет данных');
        const sec2 = gamet.split(/SEC\s+II:/);
        decoded += '\n• Секция II: Прогноз по маршруту\n' + (sec2[1] ? sec2[1] : 'Нет данных');
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга GAMET: ' + e.message;
    }
}
function parseSigmet(sigmet) {
    try {
        const groups = sigmet.split(/\s+/);
        if (groups.length < 5) return 'Ошибка: Недостаточно групп в SIGMET';
        let decoded = '';
        let i = 0;
        decoded += `• Тип: ${groups[i++]}\n`;
        decoded += `• FIR: ${groups[i++]}\n`;
        while (i < groups.length) {
            if (groups[i] === 'VALID') {
                decoded += `• Действует: ${groups[++i]}\n`;
                i++;
            } else if (groups[i].match(/TS|CB|TURB|ICE|VA|MTW/)) {
                decoded += `• Феномен: ${groups[i]}\n`;
                i++;
            } else if (groups[i] === 'OBS') decoded += `• Наблюдается: ${groups[++i]}\n`;
            else if (groups[i] === 'FCST') decoded += `• Прогноз: ${groups[++i]}\n`;
            else if (groups[i] === 'MOV') decoded += `• Движение: ${groups[++i]} ${groups[++i]}\n`;
            else i++;
        }
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга SIGMET: ' + e.message;
    }
}
function parseWarep(warep) {
    try {
        const groups = warep.split(/\s+/);
        if (groups.length < 3) return 'Ошибка: Недостаточно групп в WAREP';
        let decoded = '';
        let i = 0;
        if (groups[i] === 'WAREP') i++;
        decoded += `• Тип репорта: ${groups[i++]}\n`;
        decoded += parseMetar(groups.slice(i).join(' '));
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга WAREP: ' + e.message;
    }
}
function parseKn04(kn04) {
    try {
        const groups = kn04.split(/\s+/);
        if (groups.length < 4) return 'Ошибка: Недостаточно групп в KN-04';
        let decoded = '';
        let i = 0;
        decoded += `• Тип предупреждения: ${groups[i++]}\n`;
        decoded += `• Зона: ${groups[i++]}\n`;
        const timeMatch = groups[i]?.match(/VALID (\d{6})\/(\d{6})/);
        if (timeMatch) {
            decoded += `• Действует с ${timeMatch[1]} до ${timeMatch[2]}\n`;
            i++;
        }
        while (i < groups.length) {
            if (groups[i].match(/WIND|RAIN|STORM|TS|GR|SQ/)) decoded += `• Феномен: ${groups[i]}\n`;
            i++;
        }
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга KN-04: ' + e.message;
    }
}
function parseAirmet(airmet) {
    try {
        const groups = airmet.split(/\s+/);
        if (groups.length < 5) return 'Ошибка: Недостаточно групп в AIRMET';
        let decoded = '';
        let i = 0;
        decoded += `• Тип: AIRMET ${groups[i++]}\n`;
        decoded += `• FIR: ${groups[i++]}\n`;
        while (i < groups.length) {
            if (groups[i] === 'VALID') decoded += `• Действует: ${groups[++i]}\n`;
            else if (groups[i].match(/MTN|OBSC|ICG|TURB|WIND|MOD|ICE|BKN|CLD|SFC|VIS|ISOL|TS|OCNL|RA/)) decoded += `• Феномен (умеренный): ${groups[i]}\n`;
            i++;
        }
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга AIRMET: ' + e.message;
    }
}
document.addEventListener('DOMContentLoaded', function () {
    newEncodeExercise();
    updateTrainerStats();
    loadMiniStats(); 
    const devTypes = ['kn01', 'taf', 'gamet', 'sigmet', 'warep', 'kn04', 'airmet'];
    document.querySelectorAll('.code-type-selector .code-type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const devMessageEl = document.getElementById('dev-message');
            const modeSelectorEl = document.querySelector('.mode-selector');
            const inputSectionEl = document.querySelector('.input-section');
            document.querySelectorAll('.code-type-selector .code-type-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const type = this.dataset.type;
            if (devTypes.includes(type)) {
                if (modeSelectorEl) modeSelectorEl.style.display = 'none';
                if (inputSectionEl) inputSectionEl.style.display = 'none';
                if (devMessageEl) {
                    devMessageEl.style.display = 'block';
                    devMessageEl.textContent = 'В разработке';
                }
                if (document.getElementById('sidebar-hints')) {
                    document.getElementById('sidebar-hints').innerHTML = `<strong>${type.toUpperCase()}</strong> — Модуль находится в разработке.`;
                }
                return;
            }
            if (modeSelectorEl) modeSelectorEl.style.display = '';
            if (inputSectionEl) inputSectionEl.style.display = '';
            if (devMessageEl) devMessageEl.style.display = 'none';
            const info = codeInstructions[type];
            if (info) {
                document.getElementById('decode-instructions').innerHTML = info.decode;
                document.getElementById('sidebar-hints').innerHTML = `<strong>${info.title}</strong><br><br>` + info.hints.replace(/\n/g, '<br>');
            }
        });
    });
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.mode-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const mode = this.dataset.mode;
            document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
            document.getElementById(mode + '-content').classList.add('active');
        });
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }
    initTopMenu();
    initGameSelector();
    if (document.getElementById('score')) updateStats();
});
const codeInstructions = {
    metar: {
        title: "METAR / SPECI",
        decode: `<strong>Режим авторасшифровки METAR:</strong><br>Вставьте код — получите полную расшифровку.<br>
                         Поддерживается: ветер, видимость, RVR, погода, облачность, температура, давление, тренд, RMK.`,
        hints: `• ICAO код аэродрома<br>
                        • День и время (Z)<br>
                        • Ветер: 05007MPS или 18015G25KT<br>
                        • Видимость: 9999, 6000, CAVOK<br>
                        • Погода: RA, TS, +SHRA<br>
                        • Облачность: BKN020CB<br>
                        • Температура/точка росы: 15/12 или M02/M04<br>
                        • Q1013, A2992<br>
                        • NOSIG, BECMG, TEMPO`
    },
    kn01: {
        title: "КН-01 (Синоптический код)",
        decode: `<strong>КН-01 — наземные метеонаблюдения</strong><br>Расшифровка по группам: идентификатор, ветер, видимость, ...`,
        hints: `• 34580 — индекс станции<br>
                        • 11012 — облачность малая<br>
                        • 21089 — облачность средняя/верхняя<br>
                        • 30012 — нижняя облачность<br>
                        • 40123 — давление на уровне станции<br>
                        • 52015 — тенденция давления<br>
                        • 60022 — осадки за 6 ч<br>
                        • 70033 — осадки за 3 ч<br>
                        • 91012 — погода в срок и между сроками`
    },
    taf: {
        title: "TAF (Прогноз по аэродрому)",
        decode: `<strong>TAF — прогноз погоды</strong><br>Включает период действия, изменения FM, TEMPO, BECMG, PROB.`,
        hints: `• TAF AMD, COR<br>
                        • Период: 151200/161200<br>
                        • FM151300 — с 13:00<br>
                        • TEMPO 1514/1518 — временно<br>
                        • BECMG 1520/1522 — постепенное изменение<br>
                        • PROB30, PROB40 — вероятность`
    },
    gamet: {
        title: "GAMET (Прогноз для низких уровней)",
        decode: `<strong>GAMET — прогноз опасных явлений</strong><br>Секции: SEC I (опасности), SEC II (прогноз по маршруту).`,
        hints: `• VA — вулканический пепел<br>
                        • TC — тропический циклон<br>
                        • TURB, ICE, MTW<br>
                        • SFC WIND, VIS, SIG CLD<br>
                        • FL050-100 — уровень`
    },
    sigmet: {
        title: "SIGMET (Значительное явление)",
        decode: `<strong>SIGMET — предупреждение о значительных явлениях</strong><br>TS, TC, TURB, ICE, VA, MTW и др.`,
        hints: `• WS — SIGMET по ветру<br>
                        • WV — по турбулентности<br>
                        • WC — по обледенению<br>
                        • VALID 151200/151600<br>
                        • VA ERUPTION, TC NAME<br>
                        • OBS, FCST, MOV E 30KT`
    },
    airmet: {
        title: "AIRMET (Умеренные явления)",
        decode: `<strong>AIRMET — умеренные явления</strong><br>Аналог SIGMET, но менее интенсивные.`,
        hints: `• MOD TURB, MOD ICE<br>
                        • MT OBSC, BKN CLD<br>
                        • SFC VIS <5000M<br>
                        • ISOL TS, OCNL RA`
    },
    kn04: {
        title: "КН-04 (Штормовое предупреждение)",
        decode: `<strong>КН-04 — штормовое предупреждение по району</strong><br>Для метеорологических районов РФ.`,
        hints: `• VALID 151200/152400<br>
                        • WIND 20020MPS G35MPS<br>
                        • VIS 1000M RA<br>
                        • TS, GR, SQ<br>
                        • Район: Северо-Запад, Урал и т.д.`
    },
    warep: {
        title: "WAREP (Особый репорт)",
        decode: `<strong>WAREP — особый репорт пилота</strong><br>О турбулентности, обледенении, вулканическом пепле.`,
        hints: `• TURB SEV, ICE MOD<br>
                        • VA OBS, TC REPORT<br>
                        • FL180, POSITION<br>
                        • TIME 1230Z`
    }
};

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
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}
function toggleAccordion(element) {
    const expanded = element.getAttribute('aria-expanded') === 'true';
    element.setAttribute('aria-expanded', !expanded);
    const panel = element.nextElementSibling;
    panel.style.display = expanded ? 'none' : 'block';
}
function decodeCode() {
    document.getElementById('loading-decode').style.display = 'block';
    setTimeout(() => {
        const input = document.getElementById('metar-input').value.trim().toUpperCase();
        const resultDiv = document.getElementById('decode-result');
        const codeType = document.querySelector('.code-type-btn.active').dataset.type;
        let decoded = '';
        if (codeType === 'metar') decoded = parseMetar(input);
        else if (codeType === 'taf') decoded = parseTaf(input);
        else if (codeType === 'kn01') decoded = parseKn01(input);
        else if (codeType === 'gamet') decoded = parseGamet(input);
        else if (codeType === 'sigmet') decoded = parseSigmet(input);
        else if (codeType === 'warep') decoded = parseWarep(input);
        else if (codeType === 'kn04') decoded = parseKn04(input);
        else if (codeType === 'airmet') decoded = parseAirmet(input);
        resultDiv.textContent = decoded || 'Ошибка: Пожалуйста, введите код';
        resultDiv.className = decoded.startsWith('Ошибка') ? 'result error' : 'result';
        document.getElementById('loading-decode').style.display = 'none';
    }, 500);
}
function checkDecode() {
    document.getElementById('loading-practice-decode').style.display = 'block';
    setTimeout(() => {
        const userAnswer = document.getElementById('user-decode').value.trim().toLowerCase();
        const resultDiv = document.getElementById('practice-decode-result');
        const comparisonDiv = document.getElementById('decode-comparison');
        if (!userAnswer) {
            resultDiv.textContent = 'Ошибка: Введите вашу расшифровку';
            resultDiv.className = 'result error';
            document.getElementById('loading-practice-decode').style.display = 'none';
            return;
        }
        currentPracticeCode = document.getElementById('practice-code').textContent.trim();
        const codeType = document.querySelector('.code-type-btn.active').dataset.type;
        let correctDecoded = '';
        if (codeType === 'metar') {
            correctDecoded = parseMetar(currentPracticeCode).toLowerCase();
        } else if (codeType === 'taf') {
            correctDecoded = parseTaf(currentPracticeCode).toLowerCase();
        } else if (codeType === 'kn01') {
            correctDecoded = parseKn01(currentPracticeCode).toLowerCase();
        } else if (codeType === 'gamet') {
            correctDecoded = parseGamet(currentPracticeCode).toLowerCase();
        } else if (codeType === 'sigmet') {
            correctDecoded = parseSigmet(currentPracticeCode).toLowerCase();
        } else if (codeType === 'warep') {
            correctDecoded = parseWarep(currentPracticeCode).toLowerCase();
        } else if (codeType === 'kn04') {
            correctDecoded = parseKn04(currentPracticeCode).toLowerCase();
        } else if (codeType === 'airmet') {
            correctDecoded = parseAirmet(currentPracticeCode).toLowerCase();
        }
        const userLines = userAnswer.split('\n').map(line => line.trim()).filter(line => line);
        const correctLines = correctDecoded.split('\n').map(line => line.trim()).filter(line => line);
        let matchCount = 0;
        correctLines.forEach((correct, idx) => {
            if (userLines[idx] && userLines[idx].includes(correct)) matchCount++;
        });
        const accuracy = (matchCount / correctLines.length) * 100;
        if (accuracy > 80) {
            resultDiv.textContent = 'Отлично! Расшифровка верная! (Точность: ' + accuracy.toFixed(0) + '%)';
            resultDiv.className = 'result success';
            comparisonDiv.style.display = 'none';
            trainerStats.correctDecoded++;
            trainerStats.sessionCorrect++;
        } else {
            resultDiv.textContent = 'Есть ошибки. Точность: ' + accuracy.toFixed(0) + '%. Сравните с правильной расшифровкой:';
            resultDiv.className = 'result error';
            displayLineComparison(userLines, correctLines, 'decode');
            comparisonDiv.style.display = 'grid';
            const codeTypeKey = document.querySelector('.code-type-btn.active').dataset.type;
            trainerStats.errorsByType[codeTypeKey]++;
        }
        trainerStats.totalDecoded++;
        trainerStats.sessionDecoded++;
        updateTrainerStats();
        try { gtag('event', 'check_decode', { 'accuracy': accuracy }); } catch(e){}
        document.getElementById('loading-practice-decode').style.display = 'none';
    }, 500);
}
function displayLineComparison(userLines, correctLines, mode) {
    const userDisplay = document.getElementById(mode === 'decode' ? 'user-decode-display' : 'user-answer-display');
    const correctDisplay = document.getElementById(mode === 'decode' ? 'correct-decode-display' : 'correct-answer-display');
    userDisplay.innerHTML = '';
    correctDisplay.innerHTML = '';
    const maxLen = Math.max(userLines.length, correctLines.length);
    for (let i = 0; i < maxLen; i++) {
        const userSpan = document.createElement('div');
        const correctSpan = document.createElement('div');
        userSpan.textContent = userLines[i] || '';
        correctSpan.textContent = correctLines[i] || '';
        userSpan.classList.add('comparison-group');
        correctSpan.classList.add('comparison-group');
        if (userLines[i] === correctLines[i]) {
            userSpan.classList.add('correct');
            correctSpan.classList.add('correct');
        } else {
            userSpan.classList.add('incorrect');
            correctSpan.classList.add('incorrect');
        }
        userDisplay.appendChild(userSpan);
        correctDisplay.appendChild(correctSpan);
    }
}
function newEncodeExercise() {
    const randomIndex = Math.floor(Math.random() * weatherDatabase.length);
    currentEncodeExercise = weatherDatabase[randomIndex];
    document.getElementById('weather-description').textContent = currentEncodeExercise.description;
    document.getElementById('user-encode').value = '';
    document.getElementById('practice-encode-result').textContent = 'Результат проверки кодирования...';
    document.getElementById('practice-encode-result').className = 'result';
    document.getElementById('encode-comparison').style.display = 'none';
    document.getElementById('encode-hint').style.display = 'none';
    hintStep = 0;
    document.getElementById('next-hint-btn').style.display = 'none';
}
function checkEncode() {
    document.getElementById('loading-practice-encode').style.display = 'block';
    setTimeout(() => {
        const userCode = document.getElementById('user-encode').value.trim();
        const resultDiv = document.getElementById('practice-encode-result');
        const comparisonDiv = document.getElementById('encode-comparison');
        const codeType = document.querySelector('.code-type-btn.active').dataset.type;
        if (!userCode) {
            resultDiv.textContent = 'Ошибка: Введите ваш код';
            resultDiv.className = 'result error';
            document.getElementById('loading-practice-encode').style.display = 'none';
            return;
        }
        if (!currentEncodeExercise) {
            resultDiv.textContent = 'Ошибка: Сначала выберите задание';
            resultDiv.className = 'result error';
            document.getElementById('loading-practice-encode').style.display = 'none';
            return;
        }
        const normalizeCode = code => code.trim().toUpperCase().replace(/\s+/g, ' ').replace(/=+$/, '');
        const userNorm = normalizeCode(userCode);
        const correctNorm = normalizeCode(currentEncodeExercise.code);
        const userGroups = userNorm.split(' ');
        const correctGroups = correctNorm.split(' ');
        let feedback = '';
        let errorCount = 0;
        for (let j = 0; j < Math.max(userGroups.length, correctGroups.length); j++) {
            if (userGroups[j] !== correctGroups[j]) {
                let errorDetail = '';
                if (j === 0 && correctGroups[j] === 'METAR' && codeType === 'metar') errorDetail = ' (Ожидается тип отчёта METAR)';
                if (j === 2 && !userGroups[j]?.match(/^\d{3}\d{2,3}(G\d{2,3})?(MPS|KT)$/)) errorDetail = ' (Неверный формат ветра: направление° скорость [порывы] единицы)';
                if (j === correctGroups.length - 1 && correctGroups[j] === 'NOSIG') errorDetail = ' (Забыли NOSIG - без изменений)';
                if (j === 5 && !userGroups[j]?.match(/^(M?\d{2})\/(M?\d{2})$/)) errorDetail = ' (Неверный формат температуры: T/TD)';
                feedback += `• Ошибка в группе ${j+1}: Ожидалось ${correctGroups[j] || 'отсутствует'}, введено ${userGroups[j] || 'отсутствует'}${errorDetail}\n`;
                errorCount++;
            }
        }
        if (errorCount === 0) {
            resultDiv.textContent = 'Отлично! Код закодирован верно!';
            resultDiv.className = 'result success';
            comparisonDiv.style.display = 'none';
            trainerStats.correctDecoded++;
            trainerStats.sessionCorrect++;
        } else {
            resultDiv.textContent = 'Есть ошибки в кодировании. Детали:\n' + feedback;
            resultDiv.className = 'result error';
            displayLineComparison(userGroups, correctGroups, 'encode');
            comparisonDiv.style.display = 'grid';
            const codeTypeKey = document.querySelector('.code-type-btn.active').dataset.type;
            trainerStats.errorsByType[codeTypeKey]++;
        }
        trainerStats.totalDecoded++;
        trainerStats.sessionDecoded++;
        updateTrainerStats();
        try { gtag('event', 'check_encode', { 'success': errorCount === 0 }); } catch(e){}
        document.getElementById('loading-practice-encode').style.display = 'none';
    }, 500);
}
function showEncodeHint() {
    if (!currentEncodeExercise) return;
    hintStep = 1;
    updateHint();
    document.getElementById('next-hint-btn').style.display = 'inline-block';
}
function showNextHint() {
    hintStep++;
    updateHint();
}
function updateHint() {
    const code = currentEncodeExercise.code.trim();
    const groups = code.split(/\s+/);
    let hint = '';
    for (let i = 0; i < groups.length; i++) {
        if (i < hintStep) {
            hint += groups[i] + ' ';
        } else {
            hint += '-'.repeat(groups[i].length) + ' ';
        }
    }
    document.getElementById('encode-hint').textContent = hint.trim();
    document.getElementById('encode-hint').style.display = 'block';
    if (hintStep >= groups.length) {
        document.getElementById('next-hint-btn').style.display = 'none';
    }
}
function newPracticeCode() {
    const codes = {
        metar: ['UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG', 'UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012'],
        taf: ['TAF UUWW 141600Z 1418/1524 03005MPS 9999 BKN015 TX15/1412Z TN10/1503Z'],
        kn01: ['KN01 34580 11012 21089 30012 40123 52015 60022 70033 80044 91012'],
        gamet: ['GAMET VALID 151200/151800 UUEE SEC I: TURB MOD FL050-100 SEC II: SFC VIS 5000 RA'],
        sigmet: ['SIGMET 1 VALID 151200/151600 UUEE TS OBS AT 1200Z N OF N55 MOV E 30KT'],
        warep: ['WAREP TURB SEV FL180 TIME 1230Z POSITION 55N030E'],
        kn04: ['KN04 WARNING VALID 151200/152400 WIND 20020MPS G35MPS'],
        airmet: ['AIRMET 1 VALID 151600/151600 UUEE MOD TURB FL050-100']
    };
    const codeType = document.querySelector('.code-type-btn.active').dataset.type;
    const typeCodes = codes[codeType] || codes.metar;
    const randomCode = typeCodes[Math.floor(Math.random() * typeCodes.length)];
    document.getElementById('practice-code').textContent = randomCode;
    document.getElementById('user-decode').value = '';
    document.getElementById('practice-decode-result').textContent = 'Результат проверки...';
    document.getElementById('practice-decode-result').className = 'result';
    document.getElementById('decode-comparison').style.display = 'none';
}
function clearFields() {
    document.getElementById('metar-input').value = '';
    document.getElementById('decode-result').textContent = 'Здесь появится расшифровка кода...';
    document.getElementById('decode-result').className = 'result';
}
function copyCode(elementId) {
    const el = document.getElementById(elementId);
    const text = (el.value !== undefined) ? el.value : el.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Код скопирован!');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
}
function updateTrainerStats() {
    const percent = trainerStats.sessionDecoded > 0 ? Math.round((trainerStats.sessionCorrect / trainerStats.sessionDecoded) * 100) : 0;
    document.getElementById('trainer-level').textContent = trainerStats.level;
    document.getElementById('decoded-count').textContent = trainerStats.sessionDecoded;
    document.getElementById('correct-percent').textContent = percent + '%';
    document.getElementById('level-progress').value = trainerStats.totalDecoded % 50;
    const badge = percent > 90 ? 'Эксперт' : percent > 70 ? 'Профи' : 'Новичок';
    document.getElementById('badge').textContent = `Бейдж: ${badge}`;
    const errorsList = document.getElementById('errors-by-type');
    errorsList.innerHTML = '';
    for (const type in trainerStats.errorsByType) {
        const li = document.createElement('li');
        li.textContent = `${type.toUpperCase()}: ${trainerStats.errorsByType[type]}`;
        errorsList.appendChild(li);
    }
    if (trainerStats.totalDecoded >= trainerStats.level * 50) {
        trainerStats.level++;
    }
    localStorage.setItem('trainerStats', JSON.stringify(trainerStats));
}
function resetStats() {
    if (confirm('Сбросить статистику?')) {
        trainerStats = {"level":1,"totalDecoded":0,"correctDecoded":0,"sessionDecoded":0,"sessionCorrect":0,"errorsByType":{"metar":0,"kn01":0,"taf":0,"gamet":0,"sigmet":0,"warep":0,"kn04":0,"airmet":0}};
        localStorage.setItem('trainerStats', JSON.stringify(trainerStats));
        updateTrainerStats();
    }
}
let stats = JSON.parse(localStorage.getItem('meteoGameStats') || '{"score":0,"level":1,"games":0,"wins":0}');
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
        document.getElementById('result').innerHTML = `<span style="color:#e67e22">Подсказка: ${hint}</span>`;
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
    let timeLeft = 60 * timerSpeeds[currentTimerSpeed];
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
function showHintGuessCode() { alert('Подсказка: Вспомните стандартные коды погоды в METAR.'); }
function showHintSpeedDecode() { alert('Подсказка: Разбейте METAR на группы: ветер, видимость, температура, давление.'); }
function showHintCodeBuilder() { alert('Подсказка: Порядок групп в METAR: аэропорт, время, ветер, видимость, облачность, температура, давление.'); }
function showHintQuizBowl() { alert('Подсказка: Ответьте на основе знаний о метеокодах.'); }
function showHintTafPredictor() { alert('Подсказка: Проанализируйте изменения в TAF по сравнению с METAR.'); }
function showHintFlightPlanner() { alert('Подсказка: Оцените погоду по критериям go/no-go.'); }
function playSound(type) {
    const sound = document.getElementById(type + '-sound');
    if (sound) sound.play();
}
function showConfetti() {
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
function applySettings() {
    currentTimerSpeed = document.getElementById('timer-speed').value;
    closeSettings();
    if (currentSettingsGame === 'speed-decode') startSpeedDecode();
    if (currentSettingsGame === 'code-builder') startCodeBuilder();
}
function closeSettings() { document.getElementById('settings-panel').style.display = 'none'; }
function initTopMenu() {
    document.querySelectorAll('.top-menu button').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.disabled) return;
            document.querySelectorAll('.top-menu button').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const pageId = 'page-' + this.dataset.page;
            if (document.getElementById(pageId)) {
                document.getElementById(pageId).classList.add('active');
            }
        });
    });
}
try { updateActiveBtn(); } catch(e){}

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
        const symbols = ['❄️', '☀️', '🌧️', '🌫️'];
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
    }, 2000);
}

function snowAnimation() {
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    for (let i = 0; i < 50; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDuration = `${Math.random() * 3 + 2}s`;
        flake.style.animationDelay = `${Math.random() * 2}s`;
        flake.style.width = `${Math.random() * 5 + 5}px`;
        flake.style.height = flake.style.width;
        animContainer.appendChild(flake);
    }
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 4000);
}

function rainAnimation() {
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    for (let i = 0; i < 50; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDuration = `${Math.random() * 1 + 1}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        animContainer.appendChild(drop);
    }
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 4000);
}

function sunAnimation() {
    const animContainer = document.getElementById('animation-container');
    animContainer.style.display = 'block';
    const sun = document.createElement('div');
    sun.className = 'sun';
    animContainer.appendChild(sun);
    setTimeout(() => {
        animContainer.innerHTML = '';
        animContainer.style.display = 'none';
    }, 4000);
}