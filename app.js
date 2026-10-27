// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 일정 목록은 Supabase 표 wx_tasks 에 있음 (표 만들기: setup.sql)
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// 지역별 좌표 (가상 일정용 대표 위치)
const REGIONS = {
  '세종': { lat: 36.48, lon: 127.29 },
  '대전': { lat: 36.35, lon: 127.38 },
  '태안': { lat: 36.75, lon: 126.30 },
  '보령': { lat: 36.33, lon: 126.61 },
};

// Open-Meteo (키 불필요) 로 오늘 날씨를 받아 weatherByRegion 에 넣음
async function loadWeather() {
  const names = Object.keys(REGIONS);
  const box = document.getElementById('weatherBox');
  try {
    const testWind = new URLSearchParams(location.search).get('test') === 'wind';
    const res = await fetch(buildWeatherUrl(REGIONS));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    weatherByRegion = parseWeather(await res.json(), names, testWind);
    box.textContent = '오늘 날씨 (최고 기온 · 최대 풍속 · 강수확률) : '
      + names.map(n => n + ' ' + weatherText(weatherByRegion[n])).join(' / ');
  } catch (err) {
    weatherByRegion = {};
    box.textContent = '날씨를 받지 못했습니다. 판단은 "날씨 확인 전"으로 표시됩니다.';
  }
  renderTasks();
  renderRegionWeather();
}

// 지역별 날씨 카드 (아이콘 · 지역 · 날씨 이름 · 수치)
function renderRegionWeather() {
  const box = document.getElementById('regionWeather');
  box.innerHTML = '';
  const names = Object.keys(REGIONS);
  if (!names.some(n => weatherByRegion[n])) {
    box.textContent = '날씨를 받지 못했습니다.';
    return;
  }
  for (const n of names) {
    const w = weatherByRegion[n];
    const ic = weatherIcon(w.code);
    const item = document.createElement('div');
    item.className = 'region';
    for (const [cls, text] of [['icon', ic.icon], ['rname', n], ['wname', ic.name], ['wnum', weatherText(w)]]) {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      item.appendChild(el);
    }
    box.appendChild(item);
  }
}

// Supabase 연결 (config.js 의 주소 · 공개용 키만 사용)
let db = null;
if (window.supabase && typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://')) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// wx_tasks 표에서 일정을 읽고, 못 읽으면 안내 문구를 표시
async function loadTasks() {
  const msg = document.getElementById('dataMsg');
  tasks = [];
  try {
    if (!db) throw new Error('config.js 에 Supabase 주소 · 키가 없습니다');
    const { data, error } = await db.from('wx_tasks')
      .select('title, region, kind, owner').order('id');
    if (error) throw error;
    tasks = data;
    msg.textContent = '';
  } catch (err) {
    msg.textContent = '일정을 불러오지 못했습니다 (Supabase 연결을 확인해 주세요)';
  }
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    td.dataset.tip = r.reason;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const msgBox = document.getElementById('msgBox');
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  try {
    if (!db) throw new Error('no db');
    const { error } = await db.from('wx_tasks').insert(t);
    if (error) throw error;
    msgBox.textContent = '';
    form.reset();
    await loadTasks();
    renderTasks();
  } catch (err) {
    msgBox.textContent = '일정을 저장하지 못했습니다. 입력값과 Supabase 연결을 확인해 주세요.';
  }
}

// 제목 아래에 오늘 날짜(YYYY-MM-DD) 표시
function todayString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function showToday() {
  document.getElementById('todayDate').textContent = todayString();
}

// 지금 표를 마크다운 표로 만들어 '현장일정_판단_YYYY-MM-DD.md' 로 내려받음
function saveMarkdown() {
  const date = todayString();
  const rows = tasks.map(t => {
    const w = weatherByRegion[t.region];
    return { title: t.title, region: t.region, kind: t.kind, owner: t.owner,
      weather: weatherText(w), judge: judge(t.kind, w).text };
  });
  const blob = new Blob([buildMarkdown(date, rows)], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '현장일정_판단_' + date + '.md';
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMdBtn').addEventListener('click', saveMarkdown);
showToday();
loadTasks().then(renderTasks);
loadWeather();
