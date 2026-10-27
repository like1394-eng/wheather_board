// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
// reason 은 마우스를 올렸을 때 보여 줄 판단 기준 설명
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전', reason: '날씨를 아직 받지 못해 판단할 수 없음' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음', reason: 'R-01 · 실내 일정은 날씨와 관계없이 영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) {
    return { level: 'stop', text: '중지 검토 (강풍)',
      reason: 'R-02 · 고소 일정이고 최대 풍속이 ' + RULES.wind + 'm/s 이상이면 중지 검토 (현재 ' + w.windMax + 'm/s)' };
  }
  if (w.tempMax >= RULES.heat) {
    return { level: 'warn', text: '폭염 휴식',
      reason: 'R-03 · 최고 기온이 ' + RULES.heat + '℃ 이상이면 폭염 휴식 (현재 ' + w.tempMax + '℃)' };
  }
  if (w.rainProb >= RULES.rain) {
    return { level: 'warn', text: '우천 주의',
      reason: 'R-04 · 강수확률이 ' + RULES.rain + '% 이상이면 우천 주의 (현재 ' + w.rainProb + '%)' };
  }
  return { level: 'ok', text: '진행',
    reason: 'R-05 · 위 기준에 걸리지 않아 진행 (현재 풍속 ' + w.windMax + 'm/s · 기온 ' + w.tempMax + '℃ · 강수 ' + w.rainProb + '%)' };
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

// 표 칸 안에서 표가 깨지지 않게 | 와 줄바꿈을 바꿈
function mdCell(v) {
  return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

// 오늘 판단 결과를 마크다운 문서로 만듦 (rows: [{ title, region, kind, owner, weather, judge }])
function buildMarkdown(date, rows) {
  const lines = [
    '# 현장 일정 판단 (' + date + ')',
    '',
    '| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |',
    '|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push('| ' + [r.title, r.region, r.kind, r.owner, r.weather, r.judge].map(mdCell).join(' | ') + ' |');
  }
  lines.push('');
  lines.push('판단 기준(교육용 가상): 풍속 ' + RULES.wind + 'm/s 이상(고소 일정) · 강수확률 ' + RULES.rain
    + '% 이상 · 최고 기온 ' + RULES.heat + '℃ 이상');
  return lines.join('\n') + '\n';
}

if (typeof module !== 'undefined') module.exports = { RULES, judge, buildWeatherUrl, parseWeather, weatherIcon, buildMarkdown };
