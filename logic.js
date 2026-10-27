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
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max'
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
    };
  });
  return result;
}

if (typeof module !== 'undefined') module.exports = { RULES, judge, buildWeatherUrl, parseWeather };
