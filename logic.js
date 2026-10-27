// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// Open-Meteo 요청 주소 만들기 (regions: { 이름: { lat, lon } })
function buildWeatherUrl(regions) {
  const names = Object.keys(regions);
  return 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + names.map(n => regions[n].lat).join(',')
    + '&longitude=' + names.map(n => regions[n].lon).join(',')
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max,weather_code'
    + '&wind_speed_unit=ms&timezone=Asia/Seoul&forecast_days=1';
}

// 응답을 { 지역: { tempMax, windMax, rainProb } } 로 해석 (testWind 이면 풍속을 12로 바꿈)
function parseWeather(data, names, testWind) {
  const result = {};
  names.forEach((n, i) => {
    const d = data[i].daily;
    result[n] = {
      tempMax: Math.round(d.temperature_2m_max[0]),
      windMax: testWind ? 12 : Math.round(d.wind_speed_10m_max[0] * 10) / 10,
      rainProb: d.precipitation_probability_max[0],
      code: d.weather_code[0],
    };
  });
  return result;
}

// 날씨 코드(WMO)를 아이콘과 이름으로 바꿈
function weatherIcon(code) {
  if (code === 0) return { icon: '☀️', name: '맑음' };
  if (code >= 1 && code <= 3) return { icon: '⛅', name: '구름' };
  if (code === 45 || code === 48) return { icon: '🌫️', name: '안개' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', name: '비' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '❄️', name: '눈' };
  if (code >= 95 && code <= 99) return { icon: '⛈️', name: '뇌우' };
  return { icon: '❓', name: '알 수 없음' };
}

if (typeof module !== 'undefined') module.exports = { RULES, judge, buildWeatherUrl, parseWeather, weatherIcon };
