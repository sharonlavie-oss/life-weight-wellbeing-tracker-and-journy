// אפליקציית מעקב בסיסית בגרסה ראשונה עם localStorage
const STORAGE_KEY = 'wellbeing_tracker_v1';
const CHAT_SUMMARY_KEY = 'wellbeing_chat_summaries_v1';

const defaultState = {
  dailyRecords: {},
  nutritionHistory: [],
  wellbeingSummaries: []
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      dailyRecords: parsed.dailyRecords || {}
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(CHAT_SUMMARY_KEY, JSON.stringify(state.wellbeingSummaries));
}

const state = loadState();

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function getRecord(dateKey) {
  if (!state.dailyRecords[dateKey]) {
    state.dailyRecords[dateKey] = {
      morning: null,
      evening: null,
      createdAt: new Date().toISOString()
    };
  }
  return state.dailyRecords[dateKey];
}

function setActiveScreen(screenId) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === screenId));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.screen === screenId));
  if (screenId === 'dashboard' || screenId === 'analysis') {
    renderDashboard();
    renderAnalysis();
  }
}

function bindNavigation() {
  document.querySelectorAll('[data-screen]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveScreen(btn.dataset.screen));
  });
}

function bindRangeValues() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    const target = document.querySelector(`[data-for="${input.name}"]`);
    input.addEventListener('input', () => { target.textContent = input.value; });
  });
}

function bindHabitToggles() {
  document.querySelectorAll('.habit-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const hiddenInput = document.querySelector(`input[type="hidden"][name="${target}"]`);
      if (!hiddenInput) return;
      const isActive = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      hiddenInput.value = isActive ? 'yes' : 'no';
    });
  });
}

function resetHabitToggles(form) {
  form.querySelectorAll('input[type="hidden"]').forEach((input) => {
    input.value = 'no';
  });
  form.querySelectorAll('.habit-toggle').forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
}

function bindFloatingChatButton() {
  const chatBtn = document.getElementById('floatingChatBtn');
  if (!chatBtn) return;
  chatBtn.addEventListener('click', () => setActiveScreen('wellbeing'));
}

function yesNo(value) {
  return value === 'yes';
}

function morningHabits(morning) {
  if (!morning) return [false, false];
  return [morning.waterGlass, morning.shortWalk].map(Boolean);
}

function eveningHabits(evening) {
  if (!evening) return [false, false, false, false, false];
  return [evening.water15, evening.steps6000, evening.avoidFlourSugar, evening.tasksDone, evening.tasksTomorrow].map(Boolean);
}

function getLastDays(numDays) {
  const days = [];
  const now = new Date();
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function calcHabitsCompletion(numDays = 7) {
  const dates = getLastDays(numDays);
  let done = 0;
  let total = 0;

  dates.forEach((date) => {
    const rec = state.dailyRecords[date];
    const habits = [...morningHabits(rec?.morning), ...eveningHabits(rec?.evening)];
    habits.forEach((h) => {
      total += 1;
      if (h) done += 1;
    });
  });

  return total ? (done / total) * 100 : 0;
}

function drawWeightChart() {
  const canvas = document.getElementById('weightChart');
  const ctx = canvas.getContext('2d');
  const dates = getLastDays(30);
  const weights = dates.map((d) => state.dailyRecords[d]?.morning?.weight ?? null);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5d6d60';
  ctx.font = '12px sans-serif';
  ctx.fillText('ימים אחרונים', 10, canvas.height - 12);

  const valid = weights.filter((w) => w !== null);
  if (valid.length < 2) {
    ctx.fillText('יש להזין לפחות 2 מדידות משקל לצפייה במגמה.', 10, 30);
    return;
  }

  const min = Math.min(...valid) - 1;
  const max = Math.max(...valid) + 1;
  const xStep = (canvas.width - 40) / (dates.length - 1);

  ctx.strokeStyle = '#cad8cc';
  ctx.beginPath();
  ctx.moveTo(30, 10);
  ctx.lineTo(30, canvas.height - 30);
  ctx.lineTo(canvas.width - 10, canvas.height - 30);
  ctx.stroke();

  ctx.strokeStyle = '#4f7b58';
  ctx.lineWidth = 2;
  let started = false;

  weights.forEach((w, i) => {
    if (w === null) return;
    const x = 30 + i * xStep;
    const y = canvas.height - 30 - ((w - min) / (max - min)) * (canvas.height - 50);
    if (!started) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
    ctx.fillStyle = '#4f7b58';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.stroke();
  ctx.fillStyle = '#5d6d60';
  ctx.fillText(max.toFixed(1) + ' ק"ג', 2, 15);
  ctx.fillText(min.toFixed(1) + ' ק"ג', 2, canvas.height - 34);
}

function renderDashboard() {
  const percent = calcHabitsCompletion(7);
  document.getElementById('weeklyHabitsPercent').textContent = `${percent.toFixed(0)}%`;
  document.getElementById('weeklyHabitsText').textContent = 'מחושב לפי 7 הרגלים ביום (בוקר+ערב). ימים חסרים נספרים כאי-עמידה.';
  const bar = document.getElementById('weeklyProgressBar');
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  drawWeightChart();
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function renderAnalysis() {
  const dates = getLastDays(30);
  const mood = [];
  const sleep = [];
  const energy = [];
  const weight = [];

  dates.forEach((d) => {
    const m = state.dailyRecords[d]?.morning;
    if (m) {
      mood.push(m.mood);
      sleep.push(m.sleep);
      energy.push(m.energy);
      weight.push(m.weight);
    }
  });

  const moodAvg = avg(mood);
  const sleepAvg = avg(sleep);
  const energyAvg = avg(energy);
  const habitsPct = calcHabitsCompletion(30);

  document.getElementById('avgMood').textContent = moodAvg ? moodAvg.toFixed(1) : '-';
  document.getElementById('avgSleep').textContent = sleepAvg ? sleepAvg.toFixed(1) : '-';
  document.getElementById('avgEnergy').textContent = energyAvg ? energyAvg.toFixed(1) : '-';
  document.getElementById('analysisHabits').textContent = `${habitsPct.toFixed(0)}%`;

  if (weight.length > 1) {
    const trend = weight[weight.length - 1] - weight[0];
    const txt = trend < 0
      ? `ירידה של ${Math.abs(trend).toFixed(1)} ק"ג בתקופה האחרונה.`
      : trend > 0
        ? `עלייה של ${trend.toFixed(1)} ק"ג בתקופה האחרונה.`
        : 'המשקל יציב בתקופה האחרונה.';
    document.getElementById('weightTrend').textContent = txt;
  } else {
    document.getElementById('weightTrend').textContent = 'אין מספיק נתוני משקל למגמה.';
  }

  const summary = [];
  if (moodAvg !== null) summary.push(`ממוצע מצב הרוח הוא ${moodAvg.toFixed(1)} מתוך 10`);
  if (energyAvg !== null) summary.push(`ממוצע האנרגיה הוא ${energyAvg.toFixed(1)}`);
  if (sleepAvg !== null) summary.push(`וממוצע איכות השינה הוא ${sleepAvg.toFixed(1)}`);
  summary.push(`אחוז עמידה בהרגלים עומד על ${habitsPct.toFixed(0)}%`);
  document.getElementById('autoSummary').textContent = summary.join('. ') + '.';
}

function bindMorningForm() {
  const form = document.getElementById('morningForm');
  const feedback = document.getElementById('morningFeedback');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const date = todayKey();
    const record = getRecord(date);

    record.morning = {
      weight: Number(fd.get('weight')),
      waterGlass: yesNo(fd.get('waterGlass')),
      shortWalk: yesNo(fd.get('shortWalk')),
      sleep: Number(fd.get('sleep')),
      energy: Number(fd.get('energy')),
      mood: Number(fd.get('mood')),
      context: (fd.get('context') || '').toString().trim()
    };

    saveState();
    renderDashboard();
    renderAnalysis();

    feedback.classList.remove('hidden');
    feedback.innerHTML = `
      <h3>כל הכבוד על ההתחלה של היום 👏</h3>
      <p>את/ה בונה יציבות דרך צעדים קטנים.</p>
      <p>גם יום לא מושלם יכול להיות יום מצוין להתקדמות.</p>
      <p><strong>טיפ בריאות:</strong> נסה/י לשלב היום ארוחה אחת עם חלבון, ירק ושומן טוב. שילוב כזה יכול לאזן רעב ולעזור לריכוז לאורך היום.</p>
      <p><strong>שאלה להיום:</strong> מה פעולה קטנה אחת שתסמן לעצמך הצלחה כבר בבוקר?</p>
    `;

    resetHabitToggles(form);
  });
}

function bindEveningForm() {
  const form = document.getElementById('eveningForm');
  const feedback = document.getElementById('eveningFeedback');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const date = todayKey();
    const record = getRecord(date);

    record.evening = {
      water15: yesNo(fd.get('water15')),
      steps6000: yesNo(fd.get('steps6000')),
      avoidFlourSugar: yesNo(fd.get('avoidFlourSugar')),
      tasksDone: yesNo(fd.get('tasksDone')),
      tasksTomorrow: yesNo(fd.get('tasksTomorrow')),
      context: (fd.get('context') || '').toString().trim()
    };

    saveState();
    renderDashboard();
    renderAnalysis();

    feedback.classList.remove('hidden');
    feedback.innerHTML = `
      <h3>סיכום יומי נשמר ✅</h3>
      <p>יפה מאוד על התבוננות בסוף היום.</p>
      <p>התמדה יומית קטנה בונה שינוי גדול לאורך זמן.</p>
      <p><strong>משפט השראה:</strong> כל ערב הוא הזדמנות לסגור מעגל ולפתוח התחלה חדשה.</p>
      <p><strong>רוצה לחקור אתגר מהיום?</strong></p>
      <button id="goToWellbeing" class="primary">כן, מעבר לצ'אט רווחה</button>
    `;

    document.getElementById('goToWellbeing').addEventListener('click', () => setActiveScreen('wellbeing'));
    resetHabitToggles(form);
  });
}

function addMessage(container, text, role = 'bot') {
  const item = document.createElement('div');
  item.className = `msg ${role}`;
  item.textContent = text;
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

function bindNutritionChat() {
  const intro = document.getElementById('nutritionIntro');
  const wrap = document.getElementById('nutritionChatWrap');
  const log = document.getElementById('nutritionChat');
  const form = document.getElementById('nutritionChatForm');

  intro.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(intro);
    const goal = fd.get('goal').toString();
    const challenge = fd.get('challenge').toString();

    wrap.classList.remove('hidden');
    log.innerHTML = '';
    addMessage(log, `תודה ששיתפת. המטרה שלך: ${goal}. האתגר המרכזי: ${challenge}.`, 'bot');
    addMessage(log, 'אפשר לשאול כל שאלה תזונתית, ואני אענה בהכוונה ראשונית.', 'bot');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const msg = fd.get('message').toString().trim();
    if (!msg) return;

    addMessage(log, msg, 'user');

    const response = msg.includes('רעב')
      ? 'רעב בין ארוחות הוא נפוץ. נסה/י להוסיף חלבון וסיבים בארוחה הקודמת ולשתות מים לפני נשנוש.'
      : msg.includes('מתוק')
        ? 'אם יש חשק למתוק, נסה/י לשלב קינוח קטן מתוכנן אחרי ארוחה במקום נשנוש אקראי.'
        : 'תודה על השאלה. בגרסה הזו זו תשובת הדגמה: התקדמות תזונתית טובה מגיעה מצעדים קטנים עקביים.';

    addMessage(log, response, 'bot');
    state.nutritionHistory.push({ ts: new Date().toISOString(), user: msg, bot: response });
    saveState();
    form.reset();
  });
}

function getWellbeingOpening(style) {
  if (style === 'ACT') return 'נתחיל בגישת ACT: מה את/ה מרגיש/ה עכשיו, ומה חשוב לך לשמור עליו היום למרות הקושי?';
  if (style === 'IFS') return 'נתחיל בגישת IFS: איזה "חלק" בתוכך הכי פעיל כרגע, ומה הוא מנסה להגן עליו?';
  return 'נתחיל בתמיכה כללית: מה היה האתגר המרכזי שלך היום ומה היית רוצה לקבל כרגע?';
}

function bindWellbeingChat() {
  const startBtn = document.getElementById('startWellbeing');
  const styleSelect = document.getElementById('supportStyle');
  const wrap = document.getElementById('wellbeingChatWrap');
  const log = document.getElementById('wellbeingChat');
  const form = document.getElementById('wellbeingChatForm');
  const endBtn = document.getElementById('endConversation');
  const savedText = document.getElementById('conversationSaved');

  let session = null;

  startBtn.addEventListener('click', () => {
    const style = styleSelect.value;
    session = { style, userMessages: [] };
    wrap.classList.remove('hidden');
    savedText.textContent = '';
    log.innerHTML = '';
    addMessage(log, getWellbeingOpening(style), 'bot');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!session) return;

    const fd = new FormData(form);
    const msg = fd.get('message').toString().trim();
    if (!msg) return;

    session.userMessages.push(msg);
    addMessage(log, msg, 'user');
    addMessage(log, 'אני איתך. תודה על השיתוף. מה יעזור לך לצלוח את השעות הקרובות בצעד קטן ובריא?', 'bot');
    form.reset();
  });

  endBtn.addEventListener('click', () => {
    if (!session) return;
    const first = session.userMessages[0] || 'לא נמסר פירוט';
    const summary = {
      ts: new Date().toISOString(),
      style: session.style,
      summary: `סגנון ${session.style}. נושא מרכזי: ${first.slice(0, 90)}${first.length > 90 ? '...' : ''}`
    };
    state.wellbeingSummaries.push(summary);
    saveState();
    savedText.textContent = `השיחה הסתיימה. נשמר סיכום קצר: ${summary.summary}`;
    session = null;
  });
}

function init() {
  bindNavigation();
  bindRangeValues();
  bindHabitToggles();
  bindMorningForm();
  bindEveningForm();
  bindNutritionChat();
  bindWellbeingChat();
  bindFloatingChatButton();
  renderDashboard();
  renderAnalysis();
}

init();
