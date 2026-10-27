// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 기본 일정은 data/tasks.json 에서 읽고, 화면에서 추가한 일정만 브라우저(localStorage)에 저장
let baseTasks = [];
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

function mergeTasks() {
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = baseTasks.concat(saved);
}

// JSON 을 먼저 읽고, 못 읽으면(더블클릭으로 연 경우 등) 안내 문구를 표시
async function loadTasks() {
  const msg = document.getElementById('dataMsg');
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    baseTasks = await res.json();
    msg.textContent = '';
  } catch (err) {
    baseTasks = [];
    msg.textContent = '배포 주소로 열어 주세요';
  }
  mergeTasks();
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

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  mergeTasks();
  renderTasks();
}

// 제목 아래에 오늘 날짜(YYYY-MM-DD) 표시
function showToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('todayDate').textContent = d.getFullYear() + '-' + mm + '-' + dd;
}

document.getElementById('taskForm').addEventListener('submit', addTask);
showToday();
loadTasks().then(renderTasks);
loadWeather();
