function toggleAccordion(element) {
    const panel = element.nextElementSibling;
    const isExpanded = element.getAttribute('aria-expanded') === 'true';
    
    if (panel.style.display === "block") {
        panel.style.display = "none";
        element.setAttribute('aria-expanded', 'false');
        element.querySelector('i').classList.remove('fa-chevron-down');
        element.querySelector('i').classList.add('fa-chevron-right');
    } else {
        panel.style.display = "block";
        element.setAttribute('aria-expanded', 'true');
        element.querySelector('i').classList.remove('fa-chevron-right');
        element.querySelector('i').classList.add('fa-chevron-down');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const accordionHeaders = document.querySelectorAll('.accordion h4');
    accordionHeaders.forEach(header => {
        header.setAttribute('aria-expanded', 'false');
        if (!header.querySelector('i')) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-chevron-right';
            header.insertBefore(icon, header.firstChild);
            header.innerHTML = ' ' + header.innerHTML;
        }
    });
});

let currentEncodeExercise = null;
let trainerStats = JSON.parse(localStorage.getItem('trainerStats') || '{"level":1,"totalDecoded":0,"correctDecoded":0,"sessionDecoded":0,"sessionCorrect":0,"errorsByType":{"metar":0,"kn01":0,"taf":0,"gamet":0,"sigmet":0,"warep":0,"kn04":0,"airmet":0}}');
let hintStep = 0;
let currentPracticeCode = null;
let appSettings = JSON.parse(localStorage.getItem('meteoCoderSettings') || '{"theme":"light","fontSize":"normal","animations":true}');


const WEATHER_CODES = {
  'MI': 'мелкий', 'BC': 'пятнами', 'PR': 'частично', 'DR': 'низкий перенос', 'BL': 'высокий перенос',
  'SH': 'ливневый', 'TS': 'гроза', 'FZ': 'переохлаждённый/замерзающий',
  'DZ': 'морось', 'RA': 'дождь', 'SN': 'снег', 'SG': 'снежные зерна', 'IC': 'ледяные кристаллы',
  'PL': 'ледяная крупа', 'GR': 'град', 'GS': 'мелкий град/крупа', 'UP': 'неизвестные осадки',
  'BR': 'дымка', 'FG': 'туман', 'FU': 'дым', 'VA': 'вулканический пепел',
  'DU': 'пыль', 'SA': 'песок', 'HZ': 'мгла', 'PY': 'брызги',
  'PO': 'пыльный вихрь', 'SQ': 'шквал', 'FC': 'воронка (торнадо)', 'SS': 'песчаная буря', 'DS': 'пыльная буря'
};

const CLOUD_TYPES = {
  'SKC': 'ясно', 'CLR': 'ясно (автомат)', 'NSC': 'нет значимой облачности', 'FEW': 'малооблачно (1–2/8)',
  'SCT': 'рассеянная облачность (3–4/8)', 'BKN': 'значительная облачность (5–7/8)', 'OVC': 'сплошная облачность (8/8)',
  'VV': 'вертикальная видимость'
};

const CLOUD_SUFFIX = { 'CB': 'кучево-дождевые (Cb)', 'TCU': 'мощные кучевые (Tcu)' };

const TREND_TYPES = {
  'NOSIG': 'без значительных изменений',
  'BECMG': 'постепенное изменение',
  'TEMPO': 'временное изменение',
  'FM': 'с указанного времени',
  'TL': 'до указанного времени',
  'AT': 'в указанное время'
};

// Улучшенная система токенов с поддержкой американского формата
const TOKENS = {
  TYPE: /^(METAR|SPECI|TAF|TAF AMD|TAF COR)$/,
  ICAO: /^[A-Z]{4}$/,
  TIME: /^\d{6}Z$/,
  PERIOD: /^\d{4}\/\d{4}$/, // Исправлено: 0518/0624 вместо 051800/062400
  WIND: /^(\d{3}|VRB)(\d{2,3})(G\d{2,3})?(KT|MPS|KMH)$/,
  VAR_WIND: /^\d{3}V\d{3}$/,
  VIS: /^(CAVOK|(\d{4})|(\d{4}[NSEW])|(\d{1,2}SM)|(\d{1,2}\s?\d\/\dSM)|(\d{1,2})|(M?\d{1,2}\/\d{1,2}))$/,
  RVR: /^R\d{2}(L|C|R)?\/(P|M)?(\d{4})(V(P|M)?(\d{4}))?(U|D|N)?$/,
  WX: /^([+\-]?|VC)(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP)?(BR|FG|FU|VA|DU|SA|HZ|PY)?(PO|SQ|FC|SS|DS)?$/,
  CLOUDS: /^(FEW|SCT|BKN|OVC|VV|SKC|CLR|NSC)(\d{3})(CB|TCU)?$/,
  TEMP: /^(M?\d{2})\/(M?\d{2})$/,
  QNH: /^(Q|A)(\d{4})$/,
  TREND: /^(NOSIG|BECMG|TEMPO)$/,
  TREND_TIME: /^(FM|TL|AT)(\d{4})?$/, // Американский формат без Z
  PROB: /^PROB(\d{2})$/,
  COLOR: /^(BLU|WHT|GRN|YLO|AMB|RED|BLACK)$/,
  RUNWAY_STATE: /^(\d{2}|88|99)(\d{2}|\/\/)(\d{2}|\/\/)(\d{2}|\/\/)(\d{2}|\/\/)(\d{1}|\/)$/,
  AUTO: /^AUTO$/,
  COR: /^COR$/,
  AMD: /^AMD$/,
  NIL: /^NIL$/,
  CNL: /^CNL$/,
  RMK: /^RMK$/,
  // Американские специфические токены
  WIND_SHIFT: /^WSHFT(\d{4})$/,
  TOWER_VIS: /^TWR\s?VIS$/,
  SURFACE_VIS: /^SFC\s?VIS$/,
  VIS_2ND_LOC: /^VIS\s?\d+\s+[A-Z]+$/,
  CEILING: /^CIG\s?\d+/,
  OBSCURATION: /^[A-Z]+\s?[A-Z]+\s?OBSC$/,
  SEALEVEL_PRESSURE: /^SLP\d{3}$/,
  // Дополнительные
  T_MIN_MAX: /^(TX|TN)(M?\d{2})\/(\d{4})Z$/,
  UNKNOWN: /^.*$/
};

class Tokenizer {
  static tokenize(rawCode) {
    // Предварительная обработка для американского формата
    let processedCode = rawCode.trim().toUpperCase();
    
    // Замена двойных пробелов на одинарные
    processedCode = processedCode.replace(/\s+/g, ' ');
    
    // Обработка американского формата видимости (2 1/2SM -> 2_1/2SM)
    processedCode = processedCode.replace(/(\d)\s+(\d\/\dSM)/g, '$1_$2');
    
    // Обработка TWR VIS, SFC VIS и т.д.
    processedCode = processedCode.replace(/(TWR|SFC)\s+(VIS)/g, '$1_$2');
    processedCode = processedCode.replace(/(VIS)\s+(\d+)\s+([A-Z]+)/g, '$1_$2_$3');
    processedCode = processedCode.replace(/(CIG)\s+(\d+)/g, '$1_$2');
    
    const parts = processedCode.replace(/=+$/, '').split(/\s+/);
    const tokens = [];

    for (const part of parts) {
      let matched = false;
      for (const [type, regex] of Object.entries(TOKENS)) {
        if (regex.test(part)) {
          tokens.push({ type, value: part });
          matched = true;
          break;
        }
      }
      if (!matched) {
        tokens.push({ type: 'UNKNOWN', value: part });
      }
    }
    return tokens;
  }
}

class WeatherDecoder {
  static decode(code) {
    if (!code || code === '') return '';
    
    let result = '';
    let intensity = '';
    
    // Обработка интенсивности
    if (code.startsWith('+')) {
      intensity = 'сильный ';
      code = code.substring(1);
    } else if (code.startsWith('-')) {
      intensity = 'слабый ';
      code = code.substring(1);
    } else if (code.startsWith('VC')) {
      result += 'в окрестностях ';
      code = code.substring(2);
    }
    
    // Разбор дескрипторов и явлений
    const descriptors = ['MI', 'BC', 'PR', 'DR', 'BL', 'SH', 'TS', 'FZ'];
    const precipitations = ['DZ', 'RA', 'SN', 'SG', 'IC', 'PL', 'GR', 'GS', 'UP'];
    const obscurations = ['BR', 'FG', 'FU', 'VA', 'DU', 'SA', 'HZ', 'PY'];
    const others = ['PO', 'SQ', 'FC', 'SS', 'DS'];
    
    let foundParts = [];
    
    // Поиск дескрипторов
    for (const desc of descriptors) {
      if (code.includes(desc)) {
        foundParts.push(WEATHER_CODES[desc]);
        code = code.replace(desc, '');
      }
    }
    
    // Поиск осадков
    for (const prec of precipitations) {
      if (code.includes(prec)) {
        foundParts.push(WEATHER_CODES[prec]);
        code = code.replace(prec, '');
      }
    }
    
    // Поиск помутнений
    for (const obsc of obscurations) {
      if (code.includes(obsc)) {
        foundParts.push(WEATHER_CODES[obsc]);
        code = code.replace(obsc, '');
      }
    }
    
    // Поиск других явлений
    for (const other of others) {
      if (code.includes(other)) {
        foundParts.push(WEATHER_CODES[other]);
        code = code.replace(other, '');
      }
    }
    
    result += intensity + foundParts.join(' ');
    
    return result.trim() || code;
  }
}

class BaseParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.result = [];
    this.errors = [];
    this.isAmericanFormat = false;
  }

  current() { return this.tokens[this.pos] || null; }
  consume() { return this.tokens[this.pos++]; }
  peek(ahead = 0) { return this.tokens[this.pos + ahead] || null; }
  hasMore() { return this.pos < this.tokens.length; }

  detectAmericanFormat() {
    // Проверяем признаки американского формата
    const americanIndicators = [
      this.tokens.some(t => t.type === 'TOWER_VIS'),
      this.tokens.some(t => t.type === 'SURFACE_VIS'),
      this.tokens.some(t => t.type === 'CEILING'),
      this.tokens.some(t => t.type === 'WIND_SHIFT'),
      this.tokens.some(t => t.value.includes('SM') && t.value.includes('_'))
    ];
    
    this.isAmericanFormat = americanIndicators.some(indicator => indicator);
    return this.isAmericanFormat;
  }

  parseWind(token) {
    const match = token.value.match(TOKENS.WIND);
    if (!match) return `Ветер: ${token.value} (нестандартный формат)`;
    
    const [, direction, speed, gust, unit] = match;
    
    let result = 'Ветер: ';
    
    if (direction === '000') {
      result += 'штиль';
    } else if (direction === 'VRB') {
      result += 'переменного направления';
    } else {
      result += `${direction}°`;
    }
    
    result += ` ${speed}`;
    
    if (gust) {
      result += `, порывы до ${gust.substring(1)}`;
    }
    
    switch(unit) {
      case 'KT': result += ' узлов'; break;
      case 'MPS': result += ' м/с'; break;
      case 'KMH': result += ' км/ч'; break;
    }
    
    return result;
  }

  parseVisibility(token) {
    if (token.value === 'CAVOK') {
      return 'CAVOK — видимость ≥10 км, нет облаков ниже 5000 ft, нет погодных явлений';
    } else if (token.value === '9999') {
      return 'Видимость: 10 км или более';
    } else if (token.value.match(/^\d{4}[NSEW]$/)) {
      const dist = parseInt(token.value.substring(0, 4));
      const dir = this.getDirectionName(token.value.substring(4));
      return `Видимость: ${dist} м в направлении ${dir}`;
    } else if (token.value.includes('SM')) {
      // Американский формат: мили
      const milesStr = token.value.replace('SM', '').replace('_', ' ');
      const miles = this.parseFraction(milesStr);
      const km = Math.round(miles * 1.609 * 10) / 10;
      return `Видимость: ${milesStr} statute miles (${km} км)`;
    } else {
      const dist = parseInt(token.value);
      if (dist < 1000) {
        return `Видимость: ${dist} м`;
      } else {
        return `Видимость: ${dist / 1000} км`;
      }
    }
  }

  parseFraction(fractionStr) {
    if (fractionStr.includes('/')) {
      const [whole, frac] = fractionStr.split(' ');
      if (whole && frac) {
        const [num, den] = frac.split('/');
        return parseFloat(whole) + (parseInt(num) / parseInt(den));
      } else {
        const [num, den] = fractionStr.split('/');
        return parseInt(num) / parseInt(den);
      }
    }
    return parseFloat(fractionStr);
  }

  getDirectionName(dir) {
    const directions = {
      'N': 'север', 'S': 'юг', 'E': 'восток', 'W': 'запад',
      'NE': 'северо-восток', 'NW': 'северо-запад',
      'SE': 'юго-восток', 'SW': 'юго-запад'
    };
    return directions[dir] || dir;
  }

  parseClouds(token) {
    const match = token.value.match(TOKENS.CLOUDS);
    if (!match) return `Облачность: ${token.value} (нестандартный формат)`;
    
    const [, cover, height, type] = match;
    const heightMeters = parseInt(height) * 30;
    const heightFeet = parseInt(height) * 100;
    
    let result = `Облачность: ${CLOUD_TYPES[cover]}`;
    
    if (cover === 'VV') {
      result += `, вертикальная видимость до ${heightMeters} м (${heightFeet} ft)`;
    } else {
      result += ` на высоте ${heightMeters} м (${heightFeet} ft)`;
    }
    
    if (type) {
      result += `, ${CLOUD_SUFFIX[type]}`;
    }
    
    return result;
  }

  parseTemperature(token) {
    const match = token.value.match(TOKENS.TEMP);
    if (!match) return `Температура: ${token.value} (нестандартный формат)`;
    
    let [, temp, dew] = match;
    
    temp = temp.startsWith('M') ? `-${temp.substring(1)}` : temp;
    dew = dew.startsWith('M') ? `-${dew.substring(1)}` : dew;
    
    return `Температура: ${temp}°C, точка росы: ${dew}°C`;
  }

  parsePressure(token) {
    const match = token.value.match(TOKENS.QNH);
    if (!match) return `Давление: ${token.value} (нестандартный формат)`;
    
    const [, type, value] = match;
    
    if (type === 'Q') {
      return `Давление QNH: ${value} гПа`;
    } else {
      const inches = `${value.substring(0, 2)}.${value.substring(2)}`;
      return `Давление: ${inches} inHg`;
    }
  }

  parseTime(timeStr) {
    const day = timeStr.substring(0, 2);
    const hour = timeStr.substring(2, 4);
    const minute = timeStr.substring(4, 6);
    return `Время наблюдения: ${day} число, ${hour}:${minute} UTC`;
  }

  parseRVR(rvrStr) {
    const match = rvrStr.match(TOKENS.RVR);
    if (!match) return `RVR: ${rvrStr} (нестандартный формат)`;
    
    const [, runway, , prefix, value, , varPrefix, varValue, trend] = match;
    
    let result = `RVR ВПП ${runway}: `;
    
    if (prefix === 'P') result += 'более ';
    if (prefix === 'M') result += 'менее ';
    
    result += `${value} м`;
    
    if (varValue) {
      result += `, изменяется от `;
      if (varPrefix === 'P') result += 'более ';
      if (varPrefix === 'M') result += 'менее ';
      result += `${varValue} м`;
    }
    
    if (trend) {
      if (trend === 'U') result += ' (увеличивается)';
      if (trend === 'D') result += ' (уменьшается)';
      if (trend === 'N') result += ' (без изменений)';
    }
    
    return result;
  }

  parseTrendTime(timeStr) {
    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    return `${hour}:${minute} UTC`;
  }
}

class MetarParser extends BaseParser {
  parse() {
    try {
      this.detectAmericanFormat();
      if (this.isAmericanFormat) {
        this.result.push('Формат: Американский (US)');
      }

      let inTrend = false;
      let currentTrend = '';
      let inRemarks = false;
      let remarks = [];

      while (this.hasMore()) {
        let token = this.consume();

        if (inRemarks) {
          remarks.push(token.value);
          continue;
        }

        if (token.type === 'RMK') {
          inRemarks = true;
          continue;
        }

        if (token.type === 'NOSIG') {
          if (currentTrend) this.result.push(currentTrend.trim());
          this.result.push('Прогноз: значительных изменений не ожидается');
          currentTrend = '';
          inTrend = false;
          continue;
        }

        if (['TREND', 'TREND_TIME', 'BECMG', 'TEMPO'].includes(token.type)) {
          if (currentTrend) this.result.push(currentTrend.trim());
          currentTrend = `Прогноз (${TREND_TYPES[token.value] || token.value}): `;
          if (token.type === 'TREND_TIME') {
            const timeMatch = token.value.match(/^(FM|TL|AT)(\d{4})$/);
            if (timeMatch) {
              const [, type, time] = timeMatch;
              currentTrend += `${type === 'FM' ? 'с' : type === 'TL' ? 'до' : 'в'} ${this.parseTrendTime(time)} `;
            }
          }
          inTrend = true;
          continue;
        }

        if (inTrend) {
          switch (token.type) {
            case 'WIND':
              currentTrend += this.parseWind(token) + '; ';
              break;
            case 'VAR_WIND':
              currentTrend += `Вариация ветра: от ${token.value.substring(0, 3)}° до ${token.value.substring(4)}°; `;
              break;
            case 'VIS':
              currentTrend += this.parseVisibility(token) + '; ';
              break;
            case 'RVR':
              currentTrend += this.parseRVR(token.value) + '; ';
              break;
            case 'WX':
              currentTrend += `Погода: ${WeatherDecoder.decode(token.value)}; `;
              break;
            case 'CLOUDS':
              currentTrend += this.parseClouds(token) + '; ';
              break;
            case 'TEMP':
              currentTrend += this.parseTemperature(token) + '; ';
              break;
            case 'QNH':
              currentTrend += this.parsePressure(token) + '; ';
              break;
            default:
              currentTrend += `Дополнительная: ${token.value}; `;
              break;
          }
          continue;
        }

        // Основная часть
        switch (token.type) {
          case 'TYPE':
            this.result.push(`Тип: ${token.value}`);
            break;
          case 'COR':
            this.result.push(`Тип: Корректированное сообщение`);
            break;
          case 'AMD':
            this.result.push(`Тип: Амендированное сообщение`);
            break;
          case 'ICAO':
            this.result.push(`Аэродром: ${token.value}`);
            break;
          case 'TIME':
            this.result.push(this.parseTime(token.value));
            break;
          case 'AUTO':
            this.result.push('Автоматическое наблюдение');
            break;
          case 'WIND':
            this.result.push(this.parseWind(token));
            break;
          case 'VAR_WIND':
            this.result.push(`Вариация ветра: от ${token.value.substring(0, 3)}° до ${token.value.substring(4)}°`);
            break;
          case 'VIS':
            this.result.push(this.parseVisibility(token));
            break;
          case 'RVR':
            this.result.push(this.parseRVR(token.value));
            break;
          case 'WX':
            this.result.push(`Погода: ${WeatherDecoder.decode(token.value)}`);
            break;
          case 'CLOUDS':
            this.result.push(this.parseClouds(token));
            break;
          case 'TEMP':
            this.result.push(this.parseTemperature(token));
            break;
          case 'QNH':
            this.result.push(this.parsePressure(token));
            break;
          case 'COLOR':
            this.result.push(`Цветовой код: ${token.value}`);
            break;
          case 'RUNWAY_STATE':
            this.result.push(`Состояние ВПП: ${token.value}`);
            break;
          case 'WIND_SHIFT':
            const time = token.value.replace('WSHFT', '');
            this.result.push(`Сдвиг ветра в ${time.substring(0, 2)}:${time.substring(2)} UTC`);
            break;
          case 'TOWER_VIS':
            if (this.peek()?.type === 'VIS') {
              const vis = this.consume();
              this.result.push(`Видимость с вышки: ${this.parseVisibility(vis)}`);
            } else {
              this.result.push(`Дополнительная группа: ${token.value}`);
            }
            break;
          case 'SURFACE_VIS':
            if (this.peek()?.type === 'VIS') {
              const vis = this.consume();
              this.result.push(`Приземная видимость: ${this.parseVisibility(vis)}`);
            } else {
              this.result.push(`Дополнительная группа: ${token.value}`);
            }
            break;
          case 'VIS_2ND_LOC':
            this.result.push(`Видимость во втором месте: ${token.value.replace(/_/g, ' ')}`);
            break;
          case 'CEILING':
            const height = token.value.replace('CIG', '');
            this.result.push(`Нижняя граница облаков: ${parseInt(height) * 30} м (${height}00 ft)`);
            break;
          case 'SEALEVEL_PRESSURE':
            const pressure = token.value.replace('SLP', '');
            const hPa = pressure.startsWith('9') ? `9${pressure}` : `10${pressure}`;
            this.result.push(`Давление на уровне моря: ${hPa} гПа`);
            break;
          case 'UNKNOWN':
          default:
            if (token.value.startsWith('RE')) {
              this.result.push(`Недавняя погода: ${WeatherDecoder.decode(token.value.substring(2))}`);
            } else if (token.value.startsWith('WS')) {
              this.result.push(`Сдвиг ветра: ${token.value}`);
            } else {
              this.result.push(`Дополнительная группа: ${token.value}`);
            }
            break;
        }
      }

      if (currentTrend) this.result.push(currentTrend.trim());
      if (remarks.length > 0) this.result.push(`Замечания: ${remarks.join(' ')}`);

      return {
        text: this.result.join('\n'),
        errors: this.errors,
        success: this.errors.length === 0
      };
      
    } catch (error) {
      this.errors.push(`Ошибка парсинга: ${error.message}`);
      return {
        text: this.result.join('\n'),
        errors: this.errors,
        success: false
      };
    }
  }
}

class TafParser extends BaseParser {
  parse() {
    try {
      this.detectAmericanFormat();
      if (this.isAmericanFormat) {
        this.result.push('Формат: Американский (US)');
      }

      let inTrend = false;
      let currentTrend = '';
      let probability = '';
      let inRemarks = false;
      let remarks = [];

      while (this.hasMore()) {
        let token = this.consume();

        if (inRemarks) {
          remarks.push(token.value);
          continue;
        }

        if (token.type === 'RMK') {
          inRemarks = true;
          continue;
        }

        if (token.type === 'PROB') {
          probability = ` (вероятность ${token.value.replace('PROB', '')}%)`;
          continue;
        }

        if (token.type === 'NOSIG') {
          if (currentTrend) this.result.push(currentTrend.trim());
          this.result.push(`Прогноз: значительных изменений не ожидается${probability}`);
          probability = '';
          currentTrend = '';
          inTrend = false;
          continue;
        }

        if (['TREND', 'TREND_TIME', 'BECMG', 'TEMPO'].includes(token.type)) {
          if (currentTrend) this.result.push(currentTrend.trim());
          currentTrend = `Дополнительный прогноз${probability}: ${TREND_TYPES[token.value] || token.value}`;
          probability = '';
          if (token.type === 'TREND_TIME') {
            const timeMatch = token.value.match(/^(FM|TL|AT)(\d{4})$/);
            if (timeMatch) {
              const [, type, time] = timeMatch;
              currentTrend += ` ${type === 'FM' ? 'с' : type === 'TL' ? 'до' : 'в'} ${this.parseTrendTime(time)}`;
            }
          }
          if (this.peek()?.type === 'PERIOD') {
            const period = this.consume();
            currentTrend += ` ${this.parsePeriod(period.value)}`;
          }
          inTrend = true;
          continue;
        }

        if (inTrend) {
          switch (token.type) {
            case 'WIND':
              currentTrend += ` → ${this.parseWind(token)}; `;
              break;
            case 'VAR_WIND':
              currentTrend += ` → Вариация ветра: от ${token.value.substring(0, 3)}° до ${token.value.substring(4)}°; `;
              break;
            case 'VIS':
              currentTrend += ` → ${this.parseVisibility(token)}; `;
              break;
            case 'RVR':
              currentTrend += ` → ${this.parseRVR(token.value)}; `;
              break;
            case 'WX':
              currentTrend += ` → Погода: ${WeatherDecoder.decode(token.value)}; `;
              break;
            case 'CLOUDS':
              currentTrend += ` → ${this.parseClouds(token)}; `;
              break;
            case 'TEMP':
              currentTrend += ` → ${this.parseTemperature(token)}; `;
              break;
            case 'QNH':
              currentTrend += ` → ${this.parsePressure(token)}; `;
              break;
            default:
              currentTrend += ` → Дополнительная: ${token.value}; `;
              break;
          }
          continue;
        }

        // Основная часть
        switch (token.type) {
          case 'TYPE':
            this.result.push(`Тип: ${token.value}`);
            break;
          case 'COR':
            this.result.push(`Статус: Корректированный`);
            break;
          case 'AMD':
            this.result.push(`Статус: Амендированный`);
            break;
          case 'CNL':
            this.result.push(`Статус: Отмененный`);
            break;
          case 'ICAO':
            this.result.push(`Аэродром: ${token.value}`);
            break;
          case 'TIME':
            this.result.push(this.parseTime(token.value));
            break;
          case 'PERIOD':
            this.result.push(this.parsePeriod(token.value));
            break;
          case 'WIND':
            this.result.push(this.parseWind(token));
            break;
          case 'VAR_WIND':
            this.result.push(`Вариация ветра: от ${token.value.substring(0, 3)}° до ${token.value.substring(4)}°`);
            break;
          case 'VIS':
            this.result.push(this.parseVisibility(token));
            break;
          case 'WX':
            this.result.push(`Погода: ${WeatherDecoder.decode(token.value)}`);
            break;
          case 'CLOUDS':
            this.result.push(this.parseClouds(token));
            break;
          case 'T_MIN_MAX':
            const match = token.value.match(TOKENS.T_MIN_MAX);
            if (match) {
              const [, type, temp, time] = match;
              const tempValue = temp.startsWith('M') ? `-${temp.substring(1)}` : temp;
              const tempTime = `${time.substring(0, 2)}:${time.substring(2, 4)} UTC`;
              this.result.push(`${type === 'TX' ? 'Максимальная' : 'Минимальная'} температура: ${tempValue}°C в ${tempTime}`);
            } else {
              this.result.push(`Дополнительная группа: ${token.value}`);
            }
            break;
          case 'UNKNOWN':
          default:
            this.result.push(`Дополнительная группа: ${token.value}`);
            break;
        }
      }

      if (currentTrend) this.result.push(currentTrend.trim());
      if (remarks.length > 0) this.result.push(`Замечания: ${remarks.join(' ')}`);

      return {
        text: this.result.join('\n'),
        errors: this.errors,
        success: this.errors.length === 0
      };
      
    } catch (error) {
      this.errors.push(`Ошибка парсинга TAF: ${error.message}`);
      return {
        text: this.result.join('\n'),
        errors: this.errors,
        success: false
      };
    }
  }

  parseTime(timeStr) {
    const day = timeStr.substring(0, 2);
    const hour = timeStr.substring(2, 4);
    const minute = timeStr.substring(4, 6);
    return `Время выпуска: ${day} число, ${hour}:${minute} UTC`;
  }

  parsePeriod(periodStr) {
    const [from, to] = periodStr.split('/');
    
    // Формат: 0518/0624 (день-час/день-час)
    const fromDay = from.substring(0, 2);
    const fromHour = from.substring(2, 4);
    const toDay = to.substring(0, 2);
    const toHour = to.substring(2, 4);
    
    return `Период действия: с ${fromDay}-го ${fromHour}:00 UTC по ${toDay}-го ${toHour}:00 UTC`;
  }

  parseTrendTime(timeStr) {
    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    return `${hour}:${minute} UTC`;
  }
}

// ====================== ЭКСПОРТНЫЕ ФУНКЦИИ ======================
function parseMetar(code) {
  try {
    const tokens = Tokenizer.tokenize(code);
    const parser = new MetarParser(tokens);
    const result = parser.parse();
    
    let output = result.text;
    if (result.errors.length > 0) {
      output += '\n\n--- ОШИБКИ ПАРСИНГА ---\n' + result.errors.join('\n');
    }
    
    return output;
  } catch (error) {
    return `Критическая ошибка при парсинге METAR: ${error.message}`;
  }
}

function parseTaf(code) {
  try {
    const tokens = Tokenizer.tokenize(code);
    const parser = new TafParser(tokens);
    const result = parser.parse();
    
    let output = result.text;
    if (result.errors.length > 0) {
      output += '\n\n--- ОШИБКИ ПАРСИНГА ---\n' + result.errors.join('\n');
    }
    
    return output;
  } catch (error) {
    return `Критическая ошибка при парсинге TAF: ${error.message}`;
  }
}

// Вспомогательная функция для извлечения полей
function parseMetarFields(metar) {
  const tokens = Tokenizer.tokenize(metar);
  const parser = new MetarParser(tokens);
  parser.parse();
  
  const fields = { wind: '', vis: '', temp: '', qnh: '' };
  
  const windToken = tokens.find(t => t.type === 'WIND');
  if (windToken) fields.wind = windToken.value;
  
  const visToken = tokens.find(t => t.type === 'VIS');
  if (visToken) fields.vis = visToken.value;
  
  const tempToken = tokens.find(t => t.type === 'TEMP');
  if (tempToken) fields.temp = tempToken.value.split('/')[0].replace('M', '-');
  
  const qnhToken = tokens.find(t => t.type === 'QNH');
  if (qnhToken) fields.qnh = qnhToken.value;
  
  return fields;
}

// ====================== ИНТЕГРАЦИЯ С ИНТЕРФЕЙСОМ ======================
function decodeCode() {
  const input = document.getElementById('metar-input').value.trim();
  if (!input) {
    document.getElementById('decode-result').textContent = 'Введите код для расшифровки';
    document.getElementById('decode-result').className = 'result error';
    return;
  }
  
  document.getElementById('loading-decode').style.display = 'block';
  
  setTimeout(() => {
    const codeType = document.querySelector('.code-type-btn.active').dataset.type;
    let parsed = '';
    
    // Проверяем, доступен ли выбранный тип кода
    const availableTypes = ['metar', 'taf'];
    if (!availableTypes.includes(codeType)) {
      parsed = `Парсер для ${codeType.toUpperCase()} в разработке\n\nВыберите METAR или TAF для авторасшифровки.`;
    } else {
      try {
        if (codeType === 'metar' || codeType === 'speci') {
          parsed = parseMetar(input);
        } else if (codeType === 'taf') {
          parsed = parseTaf(input);
        }
      } catch (error) {
        parsed = `Ошибка при обработке кода: ${error.message}`;
      }
    }
    
    document.getElementById('decode-result').textContent = parsed;
    document.getElementById('decode-result').className = parsed.includes('ОШИБКИ') || parsed.includes('Ошибка') || parsed.includes('в разработке') ? 'result error' : 'result success';
    document.getElementById('loading-decode').style.display = 'none';
    
    if (availableTypes.includes(codeType)) {
      trainerStats.totalDecoded++;
      trainerStats.sessionDecoded++;
      if (!parsed.includes('ОШИБКИ') && !parsed.includes('Ошибка')) {
        trainerStats.correctDecoded++;
        trainerStats.sessionCorrect++;
      }
      updateTrainerStats();
    }
    
    try { gtag('event', 'decode_code', { 'type': codeType }); } catch(e){}
  }, 500);
}

function checkUserDecode() {
  const code = document.getElementById('practice-code').textContent.trim();
  const userDecode = document.getElementById('user-decode').value.trim();
  if (!userDecode) {
    document.getElementById('practice-decode-result').textContent = 'Введите вашу расшифровку';
    document.getElementById('practice-decode-result').className = 'result error';
    return;
  }
  
  document.getElementById('loading-practice-decode').style.display = 'block';
  
  setTimeout(() => {
    const codeType = document.querySelector('.code-type-btn.active').dataset.type;
    let correct = '';
    
    // Проверяем доступность типа кода для практики
    const availableTypes = ['metar', 'taf'];
    if (!availableTypes.includes(codeType)) {
      correct = 'Данный тип кода недоступен для практики. Выберите METAR или TAF.';
    } else {
      try {
        if (codeType === 'metar') correct = parseMetar(code);
        else if (codeType === 'taf') correct = parseTaf(code);
      } catch (error) {
        correct = `Ошибка при проверке: ${error.message}`;
      }
    }
    
    if (!availableTypes.includes(codeType)) {
      document.getElementById('practice-decode-result').textContent = correct;
      document.getElementById('practice-decode-result').className = 'result error';
      document.getElementById('loading-practice-decode').style.display = 'none';
      return;
    }
    
    const userNorm = normalizeText(userDecode);
    const correctNorm = normalizeText(correct);
    let similarity = calculateSimilarity(userNorm, correctNorm);
    let resultText = `Сходство: ${Math.round(similarity * 100)}%`;
    
    if (similarity >= 0.9) {
      resultText += '\nОтлично! Ваша расшифровка верна.';
      trainerStats.correctDecoded++;
      trainerStats.sessionCorrect++;
    } else if (similarity >= 0.7) {
      resultText += '\nХорошо, но есть неточности. Посмотрите подсказки.';
    } else {
      resultText += '\nЕсть ошибки. Попробуйте снова.';
      const codeTypeKey = document.querySelector('.code-type-btn.active').dataset.type;
      trainerStats.errorsByType[codeTypeKey]++;
    }
    
    document.getElementById('practice-decode-result').textContent = resultText;
    document.getElementById('practice-decode-result').className = similarity >= 0.9 ? 'result success' : similarity >= 0.7 ? 'result warning' : 'result error';
    
    displayLineComparison(userNorm.split('\n'), correctNorm.split('\n'), 'decode');
    document.getElementById('decode-comparison').style.display = 'grid';
    document.getElementById('loading-practice-decode').style.display = 'none';
    
    trainerStats.totalDecoded++;
    trainerStats.sessionDecoded++;
    updateTrainerStats();
    
    try { gtag('event', 'check_decode', { 'similarity': Math.round(similarity * 100) }); } catch(e){}
  }, 500);
}

// Заглушки для нереализованных парсеров
function parseKn01(code) { return 'Парсер КН-01 в разработке\nИспользуется для наземных синоптических наблюдений'; }
function parseGamet(code) { return 'Парсер GAMET в разработке\nИспользуется для прогнозов погоды в районе аэродрома'; }
function parseSigmet(code) { return 'Парсер SIGMET в разработке\nИспользуется для информации об опасных явлениях'; }
function parseWarep(code) { return 'Парсер WAREP в разработке\nИспользуется для донесений о погоде в полете'; }
function parseKn04(code) { return 'Парсер КН-04 в разработке\nИспользуется для штормовых предупреждений'; }
function parseAirmet(code) { return 'Парсер AIRMET в разработке\nИспользуется для информации об умеренно опасных явлениях'; }

// Обновленная функция для выбора типа кода
function initCodeTypeButtons() {
  document.querySelectorAll('.code-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.code-type-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      updateInstructions(this.dataset.type);
      togglePracticeModes(this.dataset.type);
    });
  });
}

// Функция для скрытия/показа режимов практики
function togglePracticeModes(codeType) {
  const practiceDecodeBtn = document.querySelector('.mode-btn[data-mode="practice-decode"]');
  const practiceEncodeBtn = document.querySelector('.mode-btn[data-mode="practice-encode"]');
  
  const availableTypes = ['metar', 'taf'];
  
  if (!availableTypes.includes(codeType)) {
    // Скрываем кнопки практики для недоступных типов
    practiceDecodeBtn.style.display = 'none';
    practiceEncodeBtn.style.display = 'none';
    
    // Активируем режим авторасшифровки
    const decodeModeBtn = document.querySelector('.mode-btn[data-mode="decode"]');
    if (decodeModeBtn) {
      decodeModeBtn.click();
    }
  } else {
    // Показываем кнопки практики для доступных типов
    practiceDecodeBtn.style.display = 'flex';
    practiceEncodeBtn.style.display = 'flex';
  }
}
function updateInstructions(codeType) {
  const instructions = document.getElementById('decode-instructions');
  const hints = document.getElementById('hints');
  
  const availableTypes = ['metar', 'taf'];
  
  if (!availableTypes.includes(codeType)) {
    instructions.innerHTML = `<strong>${codeType.toUpperCase()} в разработке</strong><br>Данный тип кода временно недоступен для авторасшифровки. Выберите METAR или TAF.`;
    hints.textContent = 'Парсер в разработке...';
    return;
  }
  
  switch(codeType) {
    case 'metar':
      instructions.innerHTML = '<strong>Режим авторасшифровки METAR/SPECI:</strong> Введите код в поле ниже и нажмите "Расшифровать".';
      hints.textContent = 'UUWW - Аэропорт Внуково\n141630Z - 14 число, 16:30 UTC\n05007MPS - Ветер 050°, 7 м/с\n9999 - Видимость 10+ км\nSCT020 - Облачность рассеянная на 2000 футов\n17/12 - Температура 17°C, точка росы 12°C\nQ1011 - Давление 1011 гПа\nNOSIG - Без значительных изменений';
      break;
    case 'taf':
      instructions.innerHTML = '<strong>Режим авторасшифровки TAF:</strong> Введите код прогноза в поле ниже.';
      hints.textContent = 'TAF - Тип сообщения (прогноз)\nUUWW - Аэропорт Внуково\n141600Z - Время выпуска 14 число, 16:00 UTC\n1418/1524 - Период действия с 14-го 18:00 до 15-го 24:00\n03005MPS - Ветер 030°, 5 м/с\n9999 - Видимость 10+ км\nBKN015 - Значительная облачность на 1500 футов\nBECMG - Постепенное изменение\nTEMPO - Временное изменение';
      break;
  }
}

// Остальные функции остаются без изменений...
function newPracticeCode() {
  const codes = {
    metar: [
      'METAR UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG',
      'SPECI UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012',
      'METAR UUEE 141500Z VRB02KT 0100 R28L/1000U FG VV001 08/07 Q0998',
      'METAR URSS 141400Z 36010G20KT 9999 -SHRA SCT015CB BKN025 12/08 Q1005'
    ],
    taf: [
      'TAF UUWW 141600Z 1418/1524 03005MPS 9999 BKN015 TX15/1412Z TN10/1503Z',
      'TAF AMD UUEE 141200Z 1412/1512 28008G15KT 9999 SCT020 BECMG 1414/1416 2000 BR BKN004',
      'TAF UUDD 141000Z 1410/1510 VRB03KT CAVOK BECMG 1418/1420 06010KT 6000 -RA SCT015'
    ],
    kn01: ['KN01 34580 11012 21089 30012 40123 52015 60022 70033 80044 91012'],
    gamet: ['GAMET VALID 151200/151800 UUEE SEC I: TURB MOD FL050-100 SEC II: SFC VIS 5000 RA'],
    sigmet: ['SIGMET 1 VALID 151200/151600 UUEE TS OBS AT 1200Z N OF N55 MOV E 30KT'],
    warep: ['WAREP TURB SEV FL180 TIME 1230Z POSITION 55N030E'],
    kn04: ['KN04 WARNING VALID 151200/152400 WIND 20020MPS G35MPS'],
    airmet: ['AIRMET 1 VALID 151600/151600 UUEE MOD TURB FL050-100']
  };
  
  const codeType = document.querySelector('.code-type-btn.active').dataset.type;
  const availableTypes = ['metar', 'taf'];
  
  if (!availableTypes.includes(codeType)) {
    document.getElementById('practice-code').textContent = 'Данный тип кода недоступен для практики';
    return;
  }
  
  const typeCodes = codes[codeType] || codes.metar;
  const randomCode = typeCodes[Math.floor(Math.random() * typeCodes.length)];
  
  document.getElementById('practice-code').textContent = randomCode;
  document.getElementById('user-decode').value = '';
  document.getElementById('practice-decode-result').textContent = 'Результат проверки...';
  document.getElementById('practice-decode-result').className = 'result';
  document.getElementById('decode-comparison').style.display = 'none';
}

// Вспомогательные функции (остаются без изменений)
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function displayLineComparison(userLines, correctLines, type) {
  const userDisplay = document.getElementById(type === 'decode' ? 'user-decode-display' : 'user-answer-display');
  const correctDisplay = document.getElementById(type === 'decode' ? 'correct-decode-display' : 'correct-answer-display');
  
  userDisplay.innerHTML = '';
  correctDisplay.innerHTML = '';
  
  const maxLines = Math.max(userLines.length, correctLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const userLine = userLines[i] || '';
    const correctLine = correctLines[i] || '';
    
    const userDiv = document.createElement('div');
    const correctDiv = document.createElement('div');
    
    if (userLine === correctLine) {
      userDiv.className = 'comparison-group correct';
      correctDiv.className = 'comparison-group correct';
    } else {
      userDiv.className = 'comparison-group incorrect';
      correctDiv.className = 'comparison-group correct';
    }
    
    userDiv.textContent = userLine;
    correctDiv.textContent = correctLine;
    
    userDisplay.appendChild(userDiv);
    correctDisplay.appendChild(correctDiv);
  }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
  initTopMenu();
  initTrainerModes();
  initCodeTypeButtons();
  updateTrainerStats();
  
  // Инициализация первого упражнения
  newPracticeCode();
  if (typeof newEncodeExercise === 'function') {
    newEncodeExercise();
  }
  
  // Скрываем практические режимы для недоступных типов кодов при старте
  const initialCodeType = document.querySelector('.code-type-btn.active').dataset.type;
  togglePracticeModes(initialCodeType);
});

// Функции для проверки
function checkDecode() {
  checkUserDecode();
}

function checkEncode() {
  if (typeof checkUserEncode === 'function') {
    checkUserEncode();
  }
}

// Остальной код остается без изменений...
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
    if (trainerStats.errorsByType[type] > 0) {
      const li = document.createElement('li');
      li.textContent = `${type.toUpperCase()}: ${trainerStats.errorsByType[type]}`;
      errorsList.appendChild(li);
    }
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

function initTrainerModes() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      
      document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const mode = this.dataset.mode;
      document.getElementById(mode + '-content').classList.add('active');
      
      const devMessage = document.getElementById('dev-message');
      if (mode === 'practice-encode') {
        devMessage.style.display = 'block';
      } else {
        devMessage.style.display = 'none';
      }
    });
  });
}

// Настройки
function openSettingsModal() {
  document.getElementById('settings-modal').style.display = 'block';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function applySettings() {
  const theme = document.getElementById('theme-select').value;
  const fontSize = document.getElementById('font-size').value;
  const animations = document.getElementById('animations-enabled').checked;
  
  document.body.className = theme;
  document.body.classList.add(`font-${fontSize}`);
  if (!animations) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
  
  appSettings = { theme, fontSize, animations };
  localStorage.setItem('meteoCoderSettings', JSON.stringify(appSettings));
  
  closeSettingsModal();
}

function loadSettings() {
  if (appSettings.theme) {
    document.getElementById('theme-select').value = appSettings.theme;
    document.body.className = appSettings.theme;
  }
  if (appSettings.fontSize) {
    document.getElementById('font-size').value = appSettings.fontSize;
    document.body.classList.add(`font-${appSettings.fontSize}`);
  }
  if (appSettings.animations !== undefined) {
    document.getElementById('animations-enabled').checked = appSettings.animations;
    if (!appSettings.animations) {
      document.body.classList.add('no-animations');
    }
  }
}

loadSettings();
function toggleAccordion(element) {
  element.classList.toggle("active");
  const panel = element.nextElementSibling;
  if (panel.style.display === "block") {
    panel.style.display = "none";
    element.setAttribute("aria-expanded", "false");
  } else {
    panel.style.display = "block";
    element.setAttribute("aria-expanded", "true");
  }
}