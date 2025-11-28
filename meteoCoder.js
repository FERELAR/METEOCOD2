/* meteoCoder.js
   Логика раздела "МЕТЕОКОДЕР": парсеры METAR/TAF/KN-01 и связаные UI-функции:
   decodeCode, checkDecode, encode exercises и подсказки.
*/

let currentEncodeExercise = null;
let trainerStats = JSON.parse(localStorage.getItem('trainerStats') || JSON.stringify({
    level: 1,
    totalDecoded: 0,
    correctDecoded: 0,
    sessionDecoded: 0,
    sessionCorrect: 0,
    errorsByType: { metar: 0, kn01: 0, taf: 0, gamet: 0, sigmet: 0, warep: 0, kn04: 0, airmet: 0 }
}));
let currentPracticeCode = null;
let hintStep = 0;

function parseMetar(metar) {
    try {
        const parts = (metar || '').trim().toUpperCase().replace(/=+$/,'').split(/\s+/);
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
            const gust = m[4] ? `, порывы до ${m[4]}` : '';
            const unit = m[5] === 'KT' ? 'узлов' : m[5] === 'MPS' ? 'м/с' : 'км/ч';
            out.push(`Ветер: ${dir}, ${speed} ${unit}${gust}`);
            i++;
        } else if (parts[i]) {
            out.push('Ошибка: Неверный формат ветра');
            i++;
        }
        if (/^\d{3}V\d{3}$/.test(parts[i])) {
            out.push(`Изменение направления ветра: от ${parts[i].slice(0,3)}° до ${parts[i].slice(4,7)}°`);
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
            for (const key of ['MI','BC','PR','DR','BL','SH','TS','FZ']) if (code.startsWith(key)) { descr += (window.WEATHER_CODES && WEATHER_CODES[key] ? WEATHER_CODES[key] : key) + ' '; code = code.slice(key.length); }
            for (const key of ['DZ','RA','SN','SG','IC','PL','GR','GS','UP']) if (code.startsWith(key)) { precip += (window.WEATHER_CODES && WEATHER_CODES[key] ? WEATHER_CODES[key] : key) + ' '; code = code.slice(key.length); }
            for (const key of ['BR','FG','FU','VA','DU','SA','HZ','PY']) if (code.startsWith(key)) { obsc += (window.WEATHER_CODES && WEATHER_CODES[key] ? WEATHER_CODES[key] : key) + ' '; code = code.slice(key.length); }
            for (const key of ['PO','SQ','FC','SS','DS']) if (code.startsWith(key)) { other += (window.WEATHER_CODES && WEATHER_CODES[key] ? WEATHER_CODES[key] : key) + ' '; code = code.slice(key.length); }
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
            const cov = (window.CLOUD_TYPES && CLOUD_TYPES[m[1]]) || m[1];
            const height = m[2] === '///' ? '' : `${parseInt(m[2])*30} м (${parseInt(m[2])*100} футов)`;
            const type = m[3] && m[3] !== '///' ? (window.CLOUD_SUFFIX && CLOUD_SUFFIX[m[3]] ? CLOUD_SUFFIX[m[3]] : m[3]) : '';
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
    return (code || '').split(/(?=[A-Z]{2})/).map(c => (window.WEATHER_CODES && WEATHER_CODES[c]) || c).join(' ');
}
function parseMetarFields(metar) {
    const parts = (metar || '').trim().toUpperCase().replace(/=+$/,'').split(/\s+/);
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
        const parts = (taf || '').trim().toUpperCase().split(/\s+/);
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
            if (parts[i] && parts[i].startsWith('PROB')) {
                prob = parts[i] + ' вероятность ';
                i++;
            }
            const type = parts[i++];
            if (type === 'FM') {
                const time = parts[i++];
                line += `${prob}С ${time.slice(0,2)} числа ${time.slice(2,4)}:${time.slice(4,6)} UTC: `;
            } else if (type === 'TEMPO' || type === 'BECMG') {
                const period = parts[i++];
                const [f,t] = (period || '').split('/');
                line += `${prob}${type === 'TEMPO' ? 'Временно' : 'Становясь'} с ${f ? f.slice(0,2) : ''} ${f ? f.slice(2) : ''}:00 до ${t ? t.slice(0,2) : ''} ${t ? t.slice(2) : ''}:00: `;
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
        const groups = (kn01 || '').split(/\s+/);
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
        const sections = (gamet || '').split(/SEC\s+I:/);
        let decoded = '';
        decoded += '• Секция I: Опасности\n' + (sections[1] ? sections[1] : 'Нет данных');
        const sec2 = (gamet || '').split(/SEC\s+II:/);
        decoded += '\n• Секция II: Прогноз по маршруту\n' + (sec2[1] ? sec2[1] : 'Нет данных');
        return decoded;
    } catch (e) {
        return 'Ошибка парсинга GAMET: ' + e.message;
    }
}
function parseSigmet(sigmet) {
    try {
        const groups = (sigmet || '').split(/\s+/);
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
        const groups = (warep || '').split(/\s+/);
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
        const groups = (kn04 || '').split(/\s+/);
        if (groups.length < 4) return 'Ошибка: Недостаточно групп в KN-04';
        let decoded = '';
        let i = 0;
        decoded += `• Тип предупреждения: ${groups[i++]}\n`;
        decoded += `• Зона: ${groups[i++]}\n`;
        const timeMatch = (kn04 || '').match(/VALID (\d{6})\/(\d{6})/);
        if (timeMatch) {
            decoded += `• Действует с ${timeMatch[1]} до ${timeMatch[2]}\n`;
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
        const groups = (airmet || '').split(/\s+/);
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
        decode: `<strong>КН-01 — наземные метеонаблюдения</strong><br>Расшифровка по группам: идентификатор, ветер, видимость,...`,
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

function decodeCode() {
    const loading = document.getElementById('loading-decode'); if (loading) loading.style.display = 'block';
    setTimeout(() => {
        const inputEl = document.getElementById('metar-input');
        const input = inputEl ? inputEl.value.trim().toUpperCase() : '';
        const resultDiv = document.getElementById('decode-result');
        const activeBtn = document.querySelector('.code-type-btn.active');
        const codeType = activeBtn ? activeBtn.dataset.type : 'metar';
        let decoded = '';
        if (codeType === 'metar') decoded = parseMetar(input);
        else if (codeType === 'taf') decoded = parseTaf(input);
        else if (codeType === 'kn01') decoded = parseKn01(input);
        else if (codeType === 'gamet') decoded = parseGamet(input);
        else if (codeType === 'sigmet') decoded = parseSigmet(input);
        else if (codeType === 'warep') decoded = parseWarep(input);
        else if (codeType === 'kn04') decoded = parseKn04(input);
        else if (codeType === 'airmet') decoded = parseAirmet(input);
        if (resultDiv) {
            resultDiv.textContent = decoded || 'Ошибка: Пожалуйста, введите код';
            resultDiv.className = decoded && decoded.startsWith('Ошибка') ? 'result error' : 'result';
        }
        if (loading) loading.style.display = 'none';
    }, 300);
}

function checkDecode() {
    const loading = document.getElementById('loading-practice-decode'); if (loading) loading.style.display = 'block';
    setTimeout(() => {
        const userAnswerEl = document.getElementById('user-decode');
        const userAnswer = userAnswerEl ? userAnswerEl.value.trim().toLowerCase() : '';
        const resultDiv = document.getElementById('practice-decode-result');
        const comparisonDiv = document.getElementById('decode-comparison');
        if (!userAnswer) {
            if (resultDiv) { resultDiv.textContent = 'Ошибка: Введите вашу расшифровку'; resultDiv.className = 'result error'; }
            if (loading) loading.style.display = 'none';
            return;
        }
        currentPracticeCode = document.getElementById('practice-code') ? document.getElementById('practice-code').textContent.trim() : '';
        const activeBtn = document.querySelector('.code-type-btn.active');
        const codeType = activeBtn ? activeBtn.dataset.type : 'metar';
        let correctDecoded = '';
        if (codeType === 'metar') correctDecoded = parseMetar(currentPracticeCode).toLowerCase();
        else if (codeType === 'taf') correctDecoded = parseTaf(currentPracticeCode).toLowerCase();
        else if (codeType === 'kn01') correctDecoded = parseKn01(currentPracticeCode).toLowerCase();
        else if (codeType === 'gamet') correctDecoded = parseGamet(currentPracticeCode).toLowerCase();
        else if (codeType === 'sigmet') correctDecoded = parseSigmet(currentPracticeCode).toLowerCase();
        else if (codeType === 'warep') correctDecoded = parseWarep(currentPracticeCode).toLowerCase();
        else if (codeType === 'kn04') correctDecoded = parseKn04(currentPracticeCode).toLowerCase();
        else if (codeType === 'airmet') correctDecoded = parseAirmet(currentPracticeCode).toLowerCase();
        const userLines = userAnswer.split('\n').map(line => line.trim()).filter(line => line);
        const correctLines = correctDecoded.split('\n').map(line => line.trim()).filter(line => line);
        let matchCount = 0;
        correctLines.forEach((correct, idx) => {
            if (userLines[idx] && userLines[idx].includes(correct)) matchCount++;
        });
        const accuracy = correctLines.length ? (matchCount / correctLines.length) * 100 : 0;
        if (accuracy > 80) {
            if (resultDiv) { resultDiv.textContent = 'Отлично! Расшифровка верная! (Точность: ' + accuracy.toFixed(0) + '%)'; resultDiv.className = 'result success'; }
            if (comparisonDiv) comparisonDiv.style.display = 'none';
            trainerStats.correctDecoded++;
            trainerStats.sessionCorrect++;
        } else {
            if (resultDiv) { resultDiv.textContent = 'Есть ошибки. Точность: ' + accuracy.toFixed(0) + '%. Сравните с правильной расшифровкой:'; resultDiv.className = 'result error'; }
            displayLineComparison(userLines, correctLines, 'decode');
            if (comparisonDiv) comparisonDiv.style.display = 'grid';
            const codeTypeKey = activeBtn ? activeBtn.dataset.type : 'metar';
            trainerStats.errorsByType[codeTypeKey] = (trainerStats.errorsByType[codeTypeKey] || 0) + 1;
        }
        trainerStats.totalDecoded++;
        trainerStats.sessionDecoded++;
        updateTrainerStats();
        try { gtag('event', 'check_decode', { 'accuracy': accuracy }); } catch(e){}
        if (loading) loading.style.display = 'none';
    }, 300);
}

function displayLineComparison(userLines, correctLines, mode) {
    const userDisplay = document.getElementById(mode === 'decode' ? 'user-decode-display' : 'user-answer-display');
    const correctDisplay = document.getElementById(mode === 'decode' ? 'correct-decode-display' : 'correct-answer-display');
    if (!userDisplay || !correctDisplay) return;
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
    try {
        const randomIndex = Math.floor(Math.random() * (window.weatherDatabase ? weatherDatabase.length : 0));
        currentEncodeExercise = window.weatherDatabase ? weatherDatabase[randomIndex] : null;
        const descEl = document.getElementById('weather-description'); if (descEl) descEl.textContent = currentEncodeExercise ? currentEncodeExercise.description : '';
        const userEncode = document.getElementById('user-encode'); if (userEncode) userEncode.value = '';
        const pres = document.getElementById('practice-encode-result'); if (pres) { pres.textContent = 'Результат проверки кодирования...'; pres.className = 'result'; }
        const comp = document.getElementById('encode-comparison'); if (comp) comp.style.display = 'none';
        const hint = document.getElementById('encode-hint'); if (hint) hint.style.display = 'none';
        hintStep = 0;
        const nextBtn = document.getElementById('next-hint-btn'); if (nextBtn) nextBtn.style.display = 'none';
    } catch(e){ console.warn(e); }
}

function checkEncode() {
    const loading = document.getElementById('loading-practice-encode'); if (loading) loading.style.display = 'block';
    setTimeout(() => {
        const userCodeEl = document.getElementById('user-encode');
        const userCode = userCodeEl ? userCodeEl.value.trim() : '';
        const resultDiv = document.getElementById('practice-encode-result');
        const comparisonDiv = document.getElementById('encode-comparison');
        const activeBtn = document.querySelector('.code-type-btn.active');
        const codeType = activeBtn ? activeBtn.dataset.type : 'metar';
        if (!userCode) {
            if (resultDiv) { resultDiv.textContent = 'Ошибка: Введите ваш код'; resultDiv.className = 'result error'; }
            if (loading) loading.style.display = 'none';
            return;
        }
        if (!currentEncodeExercise) {
            if (resultDiv) { resultDiv.textContent = 'Ошибка: Сначала выберите задание'; resultDiv.className = 'result error'; }
            if (loading) loading.style.display = 'none';
            return;
        }
        const normalizeCode = code => code.trim().toUpperCase().replace(/\s+/g, ' ').replace(/=+$/, '');
        const userNorm = normalizeCode(userCode);
        const correctNorm = normalizeCode(currentEncodeExercise.code || '');
        const userGroups = userNorm.split(' ');
        const correctGroups = correctNorm.split(' ');
        let feedback = '';
        let errorCount = 0;
        for (let j = 0; j < Math.max(userGroups.length, correctGroups.length); j++) {
            if (userGroups[j] !== correctGroups[j]) {
                feedback += `• Ошибка в группе ${j+1}: Ожидалось ${correctGroups[j] || 'отсутствует'}, введено ${userGroups[j] || 'отсутствует'}\n`;
                errorCount++;
            }
        }
        if (errorCount === 0) {
            if (resultDiv) { resultDiv.textContent = 'Отлично! Код закодирован верно!'; resultDiv.className = 'result success'; }
            if (comparisonDiv) comparisonDiv.style.display = 'none';
            trainerStats.correctDecoded++;
            trainerStats.sessionCorrect++;
        } else {
            if (resultDiv) { resultDiv.textContent = 'Есть ошибки в кодировании. Детали:\n' + feedback; resultDiv.className = 'result error'; }
            displayLineComparison(userGroups, correctGroups, 'encode');
            if (comparisonDiv) comparisonDiv.style.display = 'grid';
            const codeTypeKey = activeBtn ? activeBtn.dataset.type : 'metar';
            trainerStats.errorsByType[codeTypeKey] = (trainerStats.errorsByType[codeTypeKey] || 0) + 1;
        }
        trainerStats.totalDecoded++;
        trainerStats.sessionDecoded++;
        updateTrainerStats();
        try { gtag('event', 'check_encode', { 'success': errorCount === 0 }); } catch(e){}
        if (loading) loading.style.display = 'none';
    }, 300);
}

function showEncodeHint() {
    if (!currentEncodeExercise) return;
    hintStep = 1;
    updateHint();
    const nextBtn = document.getElementById('next-hint-btn'); if (nextBtn) nextBtn.style.display = 'inline-block';
}
function showNextHint() { hintStep++; updateHint(); }
function updateHint() {
    if (!currentEncodeExercise) return;
    const code = (currentEncodeExercise.code || '').trim();
    const groups = code.split(/\s+/);
    let hint = '';
    for (let i = 0; i < groups.length; i++) {
        if (i < hintStep) {
            hint += groups[i] + ' ';
        } else {
            hint += '-'.repeat(groups[i].length) + ' ';
        }
    }
    const el = document.getElementById('encode-hint'); if (el) { el.textContent = hint.trim(); el.style.display = 'block'; }
    if (hintStep >= groups.length) {
        const nextBtn = document.getElementById('next-hint-btn'); if (nextBtn) nextBtn.style.display = 'none';
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
    const activeBtn = document.querySelector('.code-type-btn.active');
    const codeType = activeBtn ? activeBtn.dataset.type : 'metar';
    const typeCodes = codes[codeType] || codes.metar;
    const randomCode = typeCodes[Math.floor(Math.random() * typeCodes.length)];
    const el = document.getElementById('practice-code'); if (el) el.textContent = randomCode;
    const userDecode = document.getElementById('user-decode'); if (userDecode) userDecode.value = '';
    const pres = document.getElementById('practice-decode-result'); if (pres) { pres.textContent = 'Результат проверки...'; pres.className = 'result'; }
    const comp = document.getElementById('decode-comparison'); if (comp) comp.style.display = 'none';
}

function clearFields() {
    const metarInput = document.getElementById('metar-input'); if (metarInput) metarInput.value = '';
    const dr = document.getElementById('decode-result'); if (dr) { dr.textContent = 'Здесь появится расшифровка кода...'; dr.className = 'result'; }
}

function copyCode(elementId) {
    const el = document.getElementById(elementId);
    const text = (el && el.value !== undefined) ? el.value : (el ? el.textContent : '');
    if (!navigator.clipboard) {
        alert('Копирование не поддерживается');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        alert('Код скопирован!');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
}

function updateTrainerStats() {
    try {
        const percent = trainerStats.sessionDecoded > 0 ? Math.round((trainerStats.sessionCorrect / trainerStats.sessionDecoded) * 100) : 0;
        const lvlEl = document.getElementById('trainer-level'); if (lvlEl) lvlEl.textContent = trainerStats.level;
        const decEl = document.getElementById('decoded-count'); if (decEl) decEl.textContent = trainerStats.sessionDecoded;
        const percEl = document.getElementById('correct-percent'); if (percEl) percEl.textContent = percent + '%';
        const prog = document.getElementById('level-progress'); if (prog) prog.value = trainerStats.totalDecoded % 50;
        const badge = percent > 90 ? 'Эксперт' : percent > 70 ? 'Профи' : 'Новичок';
        const badgeEl = document.getElementById('badge'); if (badgeEl) badgeEl.textContent = `Бейдж: ${badge}`;
        const errorsList = document.getElementById('errors-by-type'); if (errorsList) {
            errorsList.innerHTML = '';
            for (const type in trainerStats.errorsByType) {
                const li = document.createElement('li');
                li.textContent = `${type.toUpperCase()}: ${trainerStats.errorsByType[type]}`;
                errorsList.appendChild(li);
            }
        }
        if (trainerStats.totalDecoded >= trainerStats.level * 50) {
            trainerStats.level++;
        }
        localStorage.setItem('trainerStats', JSON.stringify(trainerStats));
    } catch(e){ console.warn('updateTrainerStats', e); }
}

function resetStats() {
    if (!confirm('Сбросить статистику?')) return;
    trainerStats = { level:1, totalDecoded:0, correctDecoded:0, sessionDecoded:0, sessionCorrect:0, errorsByType:{metar:0,kn01:0,taf:0,gamet:0,sigmet:0,warep:0,kn04:0,airmet:0} };
    localStorage.setItem('trainerStats', JSON.stringify(trainerStats));
    updateTrainerStats();
}

// DOM initialization for METEOCODER part
document.addEventListener('DOMContentLoaded', function () {
    // Initialize code type selector behavior (METEOCODER related)
    document.querySelectorAll('.code-type-selector .code-type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const devTypes = ['kn01', 'taf', 'gamet', 'sigmet', 'warep', 'kn04', 'airmet'];
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
                if (devMessageEl) { devMessageEl.style.display = 'block'; devMessageEl.textContent = 'В разработке'; }
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
                const di = document.getElementById('decode-instructions'); if (di) di.innerHTML = info.decode;
                const sh = document.getElementById('sidebar-hints'); if (sh) sh.innerHTML = `<strong>${info.title}</strong><br><br>` + info.hints.replace(/\n/g, '<br>');
            }
        });
    });

    // bind mode buttons (decode/encode practice views)
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.mode-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const mode = this.dataset.mode;
            document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
            const el = document.getElementById(mode + '-content'); if (el) el.classList.add('active');
        });
    });

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }

    // initialize METEOCODER small parts
    newEncodeExercise();
    updateTrainerStats();
});