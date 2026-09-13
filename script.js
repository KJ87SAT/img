/* ===========================================================
   学習成果報告 - ロジック
   データはブラウザの window.storage（永続ストレージAPI）に保存され、
   次回開いたときも記録が残ります。
=========================================================== */

const STORAGE_KEY = 'study_records_v1';
const GOAL_KEY = 'study_goal_minutes_v1';

let records = [];
let weeklyGoalMinutes = 0;

/* ---------- starfield ---------- */
function initStars(){
  const starsEl = document.getElementById('stars');
  const STAR_COUNT = 420;
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = document.createElement('div');
    const size = Math.random() * 1.8 + 0.4;
    s.className = 'star' + (Math.random() < 0.4 ? ' tw' : '');
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3.5) + 's';
    starsEl.appendChild(s);
  }
}

/* ---------- storage helpers ---------- */
async function loadRecords(){
  try{
    const res = await window.storage.get(STORAGE_KEY, false);
    records = res ? JSON.parse(res.value) : [];
  }catch(e){
    records = [];
  }
}

async function persistRecords(){
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(records), false);
  }catch(e){
    console.error('保存に失敗しました', e);
    showToast('保存に失敗しました');
  }
}

async function loadGoal(){
  try{
    const res = await window.storage.get(GOAL_KEY, false);
    weeklyGoalMinutes = res ? Number(res.value) : 0;
  }catch(e){
    weeklyGoalMinutes = 0;
  }
}

async function persistGoal(){
  try{
    await window.storage.set(GOAL_KEY, String(weeklyGoalMinutes), false);
  }catch(e){
    console.error('目標の保存に失敗しました', e);
  }
}

/* ---------- toast ---------- */
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- mode tabs ---------- */
function initModeTabs(){
  const tabs = document.querySelectorAll('.mode-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(target).classList.add('active');
      if (target === 'viewRecords') renderRecordsList();
      if (target === 'viewStats') renderStats();
    });
  });
}

/* ---------- dashboard panel ---------- */
function initDashboard(){
  const btn = document.getElementById('dashboardBtn');
  const panel = document.getElementById('dashboardPanel');
  btn.addEventListener('click', (e) => {
    panel.classList.toggle('open');
    e.stopPropagation();
  });
  document.addEventListener('click', () => panel.classList.remove('open'));
  panel.addEventListener('click', (e) => e.stopPropagation());

  document.getElementById('addWidgetBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const options = ['📅 カレンダーを見る', '📈 統計を見る', '📚 記録一覧を見る', '🎯 目標を設定する'];
    const choice = prompt('追加するウィジェット:\n1: ' + options[0] + '\n2: ' + options[1] + '\n3: ' + options[2] + '\n4: ' + options[3] + '\n\n番号を入力してください');
    if (choice === '1') switchToTab('viewForm');
    else if (choice === '2') switchToTab('viewStats');
    else if (choice === '3') switchToTab('viewRecords');
    else if (choice === '4') switchToTab('viewStats');
  });
}

function switchToTab(viewId){
  document.getElementById('dashboardPanel').classList.remove('open');
  const tab = document.querySelector(`.mode-tab[data-view="${viewId}"]`);
  if (tab) tab.click();
}

function updateDashboardWidgets(){
  const stats = computeStats();
  document.getElementById('widgetTotalTime').textContent = formatMinutes(stats.thisWeekMinutes);
  document.getElementById('widgetStreak').textContent = stats.streakDays + '日';
}

/* ---------- record form ---------- */
function initForm(){
  document.getElementById('submitBtn').addEventListener('click', submitRecord);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitRecord();
  });
}

async function submitRecord(){
  const period = document.getElementById('fieldPeriod').textContent.trim();
  const content = document.getElementById('fieldContent').textContent.trim();
  const purpose = document.getElementById('fieldPurpose').textContent.trim();
  const environment = document.getElementById('fieldEnvironment').textContent.trim();
  const method = document.getElementById('fieldMethod').textContent.trim();
  const minutes = Number(document.getElementById('fieldMinutes').value) || 0;
  const tags = document.getElementById('fieldTags').value.trim();

  if (!content && !purpose && minutes === 0) {
    showToast('内容を入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    period, content, purpose, environment, method, minutes, tags
  };
  records.unshift(record);
  await persistRecords();

  // フォームをクリア
  ['fieldPeriod','fieldContent','fieldPurpose','fieldEnvironment','fieldMethod'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  document.getElementById('fieldMinutes').value = '';
  document.getElementById('fieldTags').value = '';

  updateDashboardWidgets();
  showToast('報告を記録しました');
}

/* ---------- records list view ---------- */
function renderRecordsList(){
  const listEl = document.getElementById('recordsList');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  const filtered = records.filter(r => {
    if (!query) return true;
    return [r.content, r.purpose, r.environment, r.method, r.tags].join(' ').toLowerCase().includes(query);
  });

  if (filtered.length === 0){
    listEl.innerHTML = '<div class="empty-msg">まだ記録がありません</div>';
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'record-card';
    const date = new Date(r.createdAt);
    const dateStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    card.innerHTML = `
      <div class="r-date">${dateStr}${r.period ? '　|　' + escapeHtml(r.period) : ''}</div>
      <div class="r-content">${escapeHtml(r.content) || '(内容未記入)'}</div>
      <div class="r-meta">
        ${r.minutes ? `<span>⏱ ${r.minutes}分</span>` : ''}
        ${r.purpose ? `<span>🎯 ${escapeHtml(r.purpose)}</span>` : ''}
        ${r.tags ? `<span>🏷 ${escapeHtml(r.tags)}</span>` : ''}
      </div>
      <div class="r-actions">
        <button class="del" data-id="${r.id}">削除</button>
      </div>
    `;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      records = records.filter(r => r.id !== id);
      await persistRecords();
      renderRecordsList();
      updateDashboardWidgets();
      showToast('削除しました');
    });
  });
}

function escapeHtml(str){
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initRecordsToolbar(){
  document.getElementById('searchInput').addEventListener('input', renderRecordsList);
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study_records.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* ---------- stats / chart ---------- */
function computeStats(){
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);

  let thisWeekMinutes = 0;
  const byDay = {}; // 'YYYY-MM-DD' -> minutes
  records.forEach(r => {
    const d = new Date(r.createdAt);
    const key = d.toISOString().slice(0,10);
    byDay[key] = (byDay[key] || 0) + (r.minutes || 0);
    if (d >= startOfWeek) thisWeekMinutes += (r.minutes || 0);
  });

  // streak: consecutive days (including today) with at least one record
  let streakDays = 0;
  let cursor = new Date(now);
  while (true){
    const key = cursor.toISOString().slice(0,10);
    if (byDay[key] && byDay[key] > 0){
      streakDays++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // last 7 days array (oldest -> newest)
  const last7 = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0,10);
    last7.push({ label: `${d.getMonth()+1}/${d.getDate()}`, minutes: byDay[key] || 0 });
  }

  const totalAll = records.reduce((sum, r) => sum + (r.minutes || 0), 0);

  return { thisWeekMinutes, streakDays, last7, totalAll };
}

function formatMinutes(min){
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function renderStats(){
  const stats = computeStats();
  document.getElementById('statWeek').textContent = formatMinutes(stats.thisWeekMinutes);
  document.getElementById('statStreak').textContent = stats.streakDays + '日';
  document.getElementById('statTotal').textContent = formatMinutes(stats.totalAll);
  drawChart(stats.last7);
  renderGoal(stats.thisWeekMinutes);
}

function drawChart(data){
  const canvas = document.getElementById('chart');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,rect.width,rect.height);

  const max = Math.max(...data.map(d => d.minutes), 30);
  const barWidth = rect.width / data.length * 0.5;
  const gap = rect.width / data.length;

  data.forEach((d, i) => {
    const barHeight = (d.minutes / max) * (rect.height - 30);
    const x = gap * i + (gap - barWidth) / 2;
    const y = rect.height - barHeight - 20;

    const grad = ctx.createLinearGradient(0, y, 0, rect.height - 20);
    grad.addColorStop(0, 'rgba(143,233,255,0.9)');
    grad.addColorStop(1, 'rgba(79,201,236,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 4) : ctx.rect(x, y, barWidth, barHeight);
    ctx.fill();

    ctx.fillStyle = 'rgba(180,225,235,0.7)';
    ctx.font = '11px "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barWidth/2, rect.height - 4);

    if (d.minutes > 0){
      ctx.fillStyle = '#cdf3ff';
      ctx.fillText(d.minutes, x + barWidth/2, y - 4);
    }
  });
}

function initGoal(){
  document.getElementById('goalInput').addEventListener('change', async (e) => {
    weeklyGoalMinutes = Number(e.target.value) || 0;
    await persistGoal();
    renderStats();
  });
}

function renderGoal(thisWeekMinutes){
  document.getElementById('goalInput').value = weeklyGoalMinutes || '';
  const pct = weeklyGoalMinutes > 0 ? Math.min(100, Math.round(thisWeekMinutes / weeklyGoalMinutes * 100)) : 0;
  document.getElementById('goalBar').style.width = pct + '%';
  document.getElementById('goalPct').textContent = weeklyGoalMinutes > 0 ? pct + '%' : '未設定';
}

/* ---------- speech input (Web Speech API) ---------- */
let recognition = null;
let recognizing = false;
let activeField = null;

function initSpeech(){
  const micBtn = document.getElementById('micBtn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  document.querySelectorAll('.content[contenteditable]').forEach(el => {
    el.addEventListener('focus', () => activeField = el);
  });

  if (!SpeechRecognition){
    micBtn.disabled = true;
    micBtn.title = 'お使いのブラウザは音声入力に対応していません';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const target = activeField || document.getElementById('fieldContent');
    target.textContent += (target.textContent ? '　' : '') + text;
  };
  recognition.onend = () => {
    recognizing = false;
    micBtn.classList.remove('recording');
  };
  recognition.onerror = () => {
    recognizing = false;
    micBtn.classList.remove('recording');
    showToast('音声入力でエラーが発生しました');
  };

  micBtn.addEventListener('click', () => {
    if (recognizing){
      recognition.stop();
      return;
    }
    recognizing = true;
    micBtn.classList.add('recording');
    try{ recognition.start(); }catch(e){ /* already started */ }
  });
}

/* ---------- init ---------- */
window.addEventListener('DOMContentLoaded', async () => {
  initStars();
  initModeTabs();
  initDashboard();
  initForm();
  initRecordsToolbar();
  initGoal();
  initSpeech();

  await loadRecords();
  await loadGoal();
  updateDashboardWidgets();
});