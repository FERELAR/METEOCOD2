const weatherDatabase = [
    {
        description: "Фактическая погода по аэродрому Пулково 02.10.25 за 19.30 UTC, тихо, условия хорошие, температура 2 градуса, температура точки росы 0 градусов, давление QNH (на уровне моря по СА) 1032гПа, состояние всех ВПП: чистая и сухая, степень загрязнения 51-100%, высота отложений 0мм, коэффициент сцепления 0,6. Прогноз на посадку без изменений.",
        code: "METAR ULLI 021930Z 00000MPS CAVOK 02/00 Q1032 R88/090060 NOSIG="
    }
];
const WEATHER_CODES = {
    'MI': 'мелкий', 'BC': 'пятнами', 'PR': 'частично', 'DR': 'низкий перенос', 'BL': 'высокий перенос',
    'SH': 'ливень', 'TS': 'гроза', 'FZ': 'замерзающий',
    'DZ': 'морось', 'RA': 'дождь', 'SN': 'снег', 'SG': 'снежные зерна', 'IC': 'ледяные кристаллы',
    'PL': 'ледяная крупа', 'GR': 'град', 'GS': 'мелкий град', 'UP': 'неизвестные осадки',
    'BR': 'дымка', 'FG': 'туман', 'FU': 'дым', 'VA': 'вулканический пепел', 'DU': 'пыль',
    'SA': 'песок', 'HZ': 'мгла', 'PY': 'брызги',
    'PO': 'пыльный вихрь', 'SQ': 'шквал', 'FC': 'воронка', 'SS': 'песчаная буря', 'DS': 'пыльная буря'
};
const CLOUD_TYPES = {
    'FEW': 'малооблачная (1-2 октанта)', 'SCT': 'рассеянная (3-4 октанта)',
    'BKN': 'значительная (5-7 октантов)', 'OVC': 'сплошная (8 октантов)',
    'NSC': 'нет значительной облачности', 'SKC': 'ясно', 'CLR': 'ясно (автомат)',
    '///': 'неизвестно'
};
const CLOUD_SUFFIX = { 'CB': 'кучево-дождевые', 'TCU': 'мощные кучевые' };
const gameData = {
    METAR: {
        easy: [
            {code:"METAR UBBB 251600Z 27005MPS 9999 RA FEW030 20/16 Q1012 NOSIG=", errors:[3], hint:"Видимость"},
            {code:"METAR UUEE 251600Z 00000KT 9999 SCT040 15/10 Q1018", errors:[1], hint:"KT или MPS?"}
        ],
        medium: [
            {code:"METAR ULLI 251630Z 18007MPS 8000 -RA BKN007 OVC030 03/M01 Q1002 NOSIG", errors:[2,6], hint:"Видимость и облачность"},
            {code:"METAR LFPG 251700Z 22012KT 9999 SCT025 BKN100 18/12 A1014", errors:[8], hint:"Давление"}
        ],
        hard: [
            {code:"METAR KJFK 251651Z 18007KT 10SM FEW040 BKN070 OVC100 18/14 A3005 RMK AO2 SLP141", errors:[1], hint1:"Проверь единицы ветра", hint2:"Формат видимости"},
            {code:"METAR EGLL 251650Z 24015G25KT 9999 RA BKN008 OVC015 12/10 Q0998 TEMPO SHRA", errors:[4,9], hint1:"RA и SHRA — разные", hint2:"Проверь облачность"}
        ]
    },
    TAF: {
        easy: [
            {code:"TAF UBBB 2517/2618 27005KT 9999 SCT030", errors:[1], hint:"Формат времени в TAF!"},
            {code:"TAF UUEE 251720Z 2518/2618 00000MPS 9999", errors:[2], hint:"ветер в прогнозе?"}
        ],
        medium: [
            {code:"TAF AMD LFPG 2517/2624 22010KT 6000 RA BKN012", errors:[0], hint:"AMD — только при коррекции!"},
            {code:"TAF COR ULLI 2518/2618 VRB03MPS 8000 BKN020", errors:[3], hint:"Проверь видимость"}
        ],
        hard: [
            {code:"TAF KJFK 251720Z 2518/2624 18010KT P6SM SKC BECMG 2520/2522 20015G25KT", errors:[1], hint1:"Ошибка в времени?", hint2:"Формат видимости"},
            {code:"TAF EGLL 251750Z 2518/2624 24012KT 9999 BKN014 PROB30 TEMPO 2520/2522 7000 SHRA", errors:[5], hint1:"Проверь вероятность", hint2:"Видимость в TEMPO"}
        ]
    },
    GAMET: {
        easy: [
            {code:"GAMET LGGG 251500/252100 AMD 1500Z 1. SIGWX 2. SFC VIS 3. SFC WIND", errors:[2], hint:"Формат времени!"}
        ],
        medium: [
            {code:"GAMET LGGG 251500/252100 1. SIGWX TS 2. SFC VIS 5000 3. SFC WIND 27010KT", errors:[1,3], hint:"SIGWX и ветер"}
        ],
        hard: [
            {code:"GAMET LGGG 251500/252100 1. SIGWX ISOL TS 2. SFC VIS 8000 3. SFC WIND 27010KT 4. CLD BKN030", errors:[2,4], hint1:"Видимость и облачность", hint2:"Формат разделов"}
        ]
    },
    SIGMET: {
        easy: [
            {code:"SIGMET 1 VALID 251600/252000 LGGG- LGGG ATHINAI FIR SEV TURB FCST N OF N4000 FL300/400 MOV E 20KT NC=", errors:[0], hint:"Номер SIGMET"}
        ],
        medium: [
            {code:"SIGMET 2 VALID 251600/252000 LGGG- LGGG ATHINAI FIR OBSC TS FCST S OF N4000 FL250/350 MOV NE 15KT WKN=", errors:[2,3], hint:"Явление и уровни"}
        ],
        hard: [
            {code:"SIGMET 3 VALID 251600/252000 LGGG- LGGG ATHINAI FIR SEV ICE FCST N OF N3500 AND W OF E02000 FL100/200 MOV S 10KT INTSF=", errors:[4,5], hint1:"Локация и движение", hint2:"Интенсивность"}
        ]
    },
    WAREP: {
        easy: [
            {code:"WAREP UUEE 251600Z 27005MPS 9999 FEW030=", errors:[0], hint:"Формат заголовка"}
        ],
        medium: [
            {code:"WAREP UUEE 251600Z 00000KT 9999 SCT040=", errors:[1,3], hint:"Ветер и облачность"}
        ],
        hard: [
            {code:"WAREP UUEE 251600Z 18007KT 8000 -RA BKN007 OVC030=", errors:[3,5], hint1:"Видимость и облачность", hint2:"Явление"}
        ]
    },
    'КН-01': {
        easy: [
            {code:"КН-01 12345 251600Z 11111 22222 33333=", errors:[0], hint:"Формат кода"}
        ],
        medium: [
            {code:"КН-01 12345 251600Z 99999 88888 77777=", errors:[3,4], hint:"Группы"}
        ],
        hard: [
            {code:"КН-01 12345 251600Z 11111 22222 33333 44444 55555=", errors:[2,5], hint1:"Вторая группа", hint2:"Пятая группа"}
        ]
    },
    'КН-04': {
        easy: [
            {code:"КН-04 67890 251600Z AAAAA BBBBB CCCCC=", errors:[2], hint:"Формат времени"}
        ],
        medium: [
            {code:"КН-04 67890 251600Z 99999 88888 77777=", errors:[3,4], hint:"Группы"}
        ],
        hard: [
            {code:"КН-04 67890 251600Z AAAAA BBBBB CCCCC DDDDD EEEEE=", errors:[4,5], hint1:"Четвертая группа", hint2:"Пятая группа"}
        ]
    },
    SPECI: {
        easy: [
            {code:"SPECI UBBB 251600Z 27005MPS 5000 RA FEW030 20/16 Q1012=", errors:[4], hint:"Явление"}
        ],
        medium: [
            {code:"SPECI UUEE 251600Z 00000KT 3000 BR SCT040 15/10 Q1018=", errors:[3,5], hint:"Видимость и температура"}
        ],
        hard: [
            {code:"SPECI ULLI 251630Z 18007MPS 2000 +RA BKN007 OVC030 03/M01 Q1002=", errors:[2,6], hint1:"Видимость", hint2:"Облачность"}
        ]
    },
    AIRMET: {
        easy: [
            {code:"AIRMET 1 VALID 251600/252000 LGGG- LGGG ATHINAI FIR MT OBSC FCST N OF N4000 FL050/150=", errors:[0], hint:"Номер AIRMET"}
        ],
        medium: [
            {code:"AIRMET 2 VALID 251600/252000 LGGG- LGGG ATHINAI FIR SFC VIS 5000 BR FCST S OF N4000=", errors:[5,6], hint:"Видимость и явление"}
        ],
        hard: [
            {code:"AIRMET 3 VALID 251600/252000 LGGG- LGGG ATHINAI FIR MOD TURB FCST N OF N3500 FL100/200 MOV E 10KT NC=", errors:[3,7], hint1:"Явление", hint2:"Движение"}
        ]
    }
};
const guessGameData = {
    metar: [
        {desc: "дымка", code: "BR"},
        {desc: "слабый дождь", code: "-RA"},
        {desc: "ливневый дождь", code: "SHRA"},
        {desc: "туман", code: "FG"},
        {desc: "без значительных изменений", code: "NOSIG"},
        {desc: "рассеянная облачность", code: "SCT"},
        {desc: "сплошная облачность", code: "OVC"}
    ]
};
const speedDecodeData = [
    "UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG",
    "UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012",
    "URSS 141630Z 00000MPS CAVOK 20/15 Q1010",
    "KMSN 150153Z 14007KT 10SM SCT100 BKN120 M01/M07 A3008 RMK AO2 SLP198",
    "EGLL 251650Z VRB03KT 9999 FEW030 15/10 Q1018 NOSIG",
    "ULLI 021930Z 00000MPS CAVOK 02/00 Q1032 R88/090060 NOSIG"
];
const codeBuilderData = [
    {description: "Аэропорт Внуково, 14 число, 16:30 UTC, ветер 050° 7 м/с, видимость 10+ км, рассеянная облачность на 2000 футов, температура 17°C, точка росы 12°C, давление 1011 гПа, без изменений", code: "UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG"},
    {description: "Аэропорт Домодедово, 14 число, 16:00 UTC, ветер 030° 5 м/с, видимость 10+ км, разорванная облачность на 1500 футах, температура 15°C, точка росы 10°C, давление 1012 гПа", code: "UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012"},
    {description: "Аэропорт Сочи, 14 число, 16:30 UTC, штиль, CAVOK, температура 20°C, точка росы 15°C, давление 1010 гПа", code: "URSS 141630Z 00000MPS CAVOK 20/15 Q1010"},
    {description: "Аэропорт Пулково, 02 число, 19:30 UTC, штиль, CAVOK, температура 02°C, точка росы 00°C, давление 1032 гПа, RMK R88/090060, без изменений", code: "ULLI 021930Z 00000MPS CAVOK 02/00 Q1032 R88/090060 NOSIG"},
    {description: "Аэропорт Хитроу, 25 число, 16:50 UTC, ветер переменный 3 узла, видимость 10+ км, малооблачно на 3000 футах, температура 15°C, точка росы 10°C, давление 1018 гПа, без изменений", code: "EGLL 251650Z VRB03KT 9999 FEW030 15/10 Q1018 NOSIG"}
];
const quizQuestions = [
    {question: "Что значит SCT040?", options: ["Рассеянная облачность на 4000 футов", "Сплошная", "Разорванная", "Малооблачно"], correct: 0},
    {question: "Код для тумана", options: ["BR", "HZ", "FG", "FU"], correct: 2},
    {question: "Что значит CAVOK?", options: ["Видимость >10км, без погоды", "Облачность", "Ветер", "Давление"], correct: 0},
    {question: "Код для грозы", options: ["TS", "RA", "SN", "FG"], correct: 0},
    {question: "Что значит NOSIG?", options: ["Без изменений", "С изменениями", "Прогноз", "Ошибка"], correct: 0},
    {question: "Код для снега", options: ["SN", "RA", "DZ", "BR"], correct: 0}
];
const tafPredictorData = [
    {metar: "UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG", taf: "TAF UUWW 141600Z 1418/1524 03005MPS 9999 BKN015 TX15/1412Z TN10/1503Z", question: "Какая минимальная температура ожидается?", answer: "10"},
    {metar: "UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012", taf: "TAF UUDD 141500Z 1416/1518 04006MPS 8000 OVC010 TEMPO 1418/1506 3000 BR BKN005", question: "Будет ли туман?", answer: "Да"},
    {metar: "URSS 141630Z 00000MPS CAVOK 20/15 Q1010", taf: "TAF URSS 141600Z 1418/1524 VRB02MPS 9999 FEW030", question: "Изменится ли ветер?", answer: "Нет"},
    {metar: "ULLI 021930Z 00000MPS CAVOK 02/00 Q1032 R88/090060 NOSIG", taf: "TAF ULLI 021800Z 0219/0321 35004MPS 9999 BKN020", question: "Какая облачность ожидается?", answer: "BKN020"},
    {metar: "EGLL 251650Z VRB03KT 9999 FEW030 15/10 Q1018 NOSIG", taf: "TAF EGLL 251600Z 2518/2624 20005KT 9999 SCT025 PROB30 TEMPO 2600/2609 BKN010", question: "Вероятность низкой облачности?", answer: "30%"}
];
const flightPlannerData = [
    {route: "UUWW: METAR UUWW 141630Z 05007MPS 9999 SCT020 17/12 Q1011 NOSIG\nUUDD: METAR UUDD 141600Z 03005MPS 9999 BKN015 15/10 Q1012\nURSS: METAR URSS 141630Z 00000MPS CAVOK 20/15 Q1010", expected: "go", points: 50},
    {route: "ULLI: METAR ULLI 021930Z 00000MPS CAVOK 02/00 Q1032\nEGLL: METAR EGLL 251650Z VRB03KT 9999 FEW030 15/10 Q1018 NOSIG\nKMSN: METAR KMSN 150153Z 14007KT 10SM SCT100 BKN120 M01/M07 A3008", expected: "alternate", points: 30}
];