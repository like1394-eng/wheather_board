// api/kma.js – Vercel 서버 함수: /api/kma?region=대전
// 그 지역의 일정(Supabase wx_tasks) · 오늘 날씨(기상청 단기예보) · 판단을 JSON 으로 돌려줌
// 환경변수 : KMA_KEY, SUPABASE_URL, SUPABASE_ANON_KEY (키는 응답 · 로그에 내보내지 않음)

const { judge } = require('../logic.js');

// 지역별 대표 위치 (app.js 의 REGIONS 와 같은 좌표)
const REGIONS = {
  '세종': { lat: 36.48, lon: 127.29 },
  '대전': { lat: 36.35, lon: 127.38 },
  '태안': { lat: 36.75, lon: 126.30 },
  '보령': { lat: 36.33, lon: 126.61 },
};

// 위경도 → 기상청 격자(nx, ny) : 기상청 공개 변환식 (Lambert 정각원추도법)
function toGrid(lat, lon) {
  const D = Math.PI / 180;
  const re = 6371.00877 / 5.0;
  const slat1 = 30 * D, slat2 = 60 * D, olon = 126 * D, olat = 38 * D;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * D * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * D - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5),
  };
}

// 한국 시간 기준 오늘 날짜(YYYYMMDD)와 단기예보 발표 기준 시각
function kstBase() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const ymd = d => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  const today = ymd(now);
  // 02:10 이후면 오늘 0200 발표분, 그 전이면 어제 2300 발표분 사용
  const afterRelease = now.getUTCHours() * 60 + now.getUTCMinutes() >= 2 * 60 + 10;
  if (afterRelease) return { today, baseDate: today, baseTime: '0200' };
  const yesterday = ymd(new Date(now.getTime() - 24 * 3600 * 1000));
  return { today, baseDate: yesterday, baseTime: '2300' };
}

// 기상청 단기예보 → { tempMax, windMax, rainProb, sky }
async function fetchKmaWeather(region) {
  const key = process.env.KMA_KEY;
  if (!key) throw new Error('no key');
  let decoded = key;
  try { decoded = decodeURIComponent(key); } catch (e) { /* 이미 풀린 키 */ }   // 인코딩 · 디코딩 키 둘 다 허용
  const { nx, ny } = toGrid(REGIONS[region].lat, REGIONS[region].lon);
  const { today, baseDate, baseTime } = kstBase();
  const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
    + '?serviceKey=' + encodeURIComponent(decoded)
    + '&pageNo=1&numOfRows=1000&dataType=JSON'
    + '&base_date=' + baseDate + '&base_time=' + baseTime + '&nx=' + nx + '&ny=' + ny;
  const res = await fetch(url);
  if (!res.ok) throw new Error('kma http ' + res.status);
  const json = await res.json();
  if (json.response.header.resultCode !== '00') throw new Error('kma result ' + json.response.header.resultCode);
  const items = json.response.body.items.item.filter(it => it.fcstDate === today);
  if (!items.length) throw new Error('kma empty');

  const nums = cat => items.filter(it => it.category === cat).map(it => Number(it.fcstValue));
  const max = arr => (arr.length ? Math.max(...arr) : null);
  const tmx = nums('TMX');
  const tempMax = Math.round(tmx.length ? Math.max(...tmx) : max(nums('TMP')));   // TMX 가 없으면 시간별 기온 최댓값
  const windMax = max(nums('WSD'));
  const rainProb = max(nums('POP'));
  if ([tempMax, windMax, rainProb].some(v => v === null || Number.isNaN(v))) throw new Error('kma missing');

  // 하늘 상태 : 강수형태(PTY)가 있으면 비/눈, 없으면 하늘상태(SKY)
  const pty = max(nums('PTY')) || 0;
  const skyMax = max(nums('SKY')) || 1;
  const sky = pty >= 3 && pty !== 4 ? '눈' : pty > 0 ? '비' : skyMax >= 4 ? '흐림' : skyMax >= 3 ? '구름많음' : '맑음';
  return { tempMax, windMax: Math.round(windMax * 10) / 10, rainProb, sky };
}

// Supabase REST 로 그 지역 일정 읽기 (공개용 키, 읽기만)
async function fetchTasks(region) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('no supabase env');
  const url = base + '/rest/v1/wx_tasks?select=title,region,kind,owner&order=id&region=eq.' + encodeURIComponent(region);
  const res = await fetch(url, { headers: { apikey: key } });
  if (!res.ok) throw new Error('supabase http ' + res.status);
  return res.json();
}

module.exports = async (req, res) => {
  const region = req.query && req.query.region;
  if (!Object.keys(REGIONS).includes(region)) {
    return res.status(400).json({ error: 'region 은 ' + Object.keys(REGIONS).join(' · ') + ' 중 하나여야 합니다' });
  }

  let tasks;
  try {
    tasks = await fetchTasks(region);
  } catch (e) {
    return res.status(502).json({ error: '일정을 불러오지 못했습니다' });
  }

  // 날씨를 못 받아도 일정은 돌려줌 (판단은 '날씨 확인 전')
  let weather = null;
  try {
    weather = await fetchKmaWeather(region);
  } catch (e) {
    weather = null;
  }

  const { today } = kstBase();
  res.setHeader('Cache-Control', 's-maxage=600');
  res.status(200).json({
    region,
    date: today.slice(0, 4) + '-' + today.slice(4, 6) + '-' + today.slice(6),
    weather,
    tasks: tasks.map(t => ({ title: t.title, kind: t.kind, owner: t.owner, judgment: judge(t.kind, weather) })),
  });
};
