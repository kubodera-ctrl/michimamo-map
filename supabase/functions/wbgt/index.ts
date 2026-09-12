const MASTER_URL = "https://www.wbgt.env.go.jp/man15NH/wbgt_point_master-20260515.csv";
const FORECAST_URL = "https://www.wbgt.env.go.jp/api/v1/getForecastData";
const SURVEY_URL = "https://www.wbgt.env.go.jp/api/v1/getSurveyData";
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

type Station = {
  no: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

let stationCache: { loadedAt: number; stations: Station[] } | null = null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function jstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function compactJst(date: Date) {
  const p = jstParts(date);
  return `${p.year}${pad(p.month)}${pad(p.day)}${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

function dayJst(date: Date) {
  const p = jstParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function parseOfficialJst(value: string) {
  const m = String(value).match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5], +m[6]));
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value.trim()); value = "";
    } else value += char;
  }
  result.push(value.trim());
  return result;
}

async function loadStations(): Promise<Station[]> {
  if (stationCache && Date.now() - stationCache.loadedAt < 24 * 60 * 60 * 1000) return stationCache.stations;
  const response = await fetch(MASTER_URL, { headers: { Accept: "text/csv" } });
  if (!response.ok) throw new Error("station master unavailable");
  const text = (await response.text()).replace(/^\uFEFF/, "");
  const today = dayJst(new Date());
  const stations = text.split(/\r?\n/).slice(1).filter(Boolean).map(splitCsvLine).flatMap((row) => {
    const start = row[11];
    const end = row[12];
    const latitude = Number(row[7]) + Number(row[8]) / 60;
    const longitude = Number(row[9]) + Number(row[10]) / 60;
    if (!/^\d{5}$/.test(row[2]) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    if (start && start > today) return [];
    if (end && end !== "9999-99-99" && end < today) return [];
    return [{ no: Number(row[2]), name: row[3], address: row[6], latitude, longitude }];
  });
  if (stations.length < 800) throw new Error("invalid station master");
  stationCache = { loadedAt: Date.now(), stations };
  return stations;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOfficialJson(url: URL) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("official API unavailable");
  const payload = await response.json();
  if (payload?.status !== "success" || !Array.isArray(payload.data)) throw new Error("official API error");
  return payload.data;
}

function levelFor(value: number) {
  if (value >= 31) return { level: "危険", guidance: "屋外での運動は原則中止してください" };
  if (value >= 28) return { level: "厳重警戒", guidance: "激しい運動は中止し、外出時は炎天下を避けてください" };
  if (value >= 25) return { level: "警戒", guidance: "積極的に休息し、こまめに水分・塩分を補給してください" };
  if (value >= 21) return { level: "注意", guidance: "積極的に水分を補給し、体調変化に注意してください" };
  return { level: "暑さ指数21未満", guidance: "状況に応じて、こまめに水分を補給してください" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const requestUrl = new URL(req.url);
  const latitude = Number(requestUrl.searchParams.get("lat"));
  const longitude = Number(requestUrl.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < 20 || latitude > 46 || longitude < 122 || longitude > 154) {
    return json({ error: "invalid_location", message: "日本国内の位置を指定してください" }, 400);
  }

  try {
    const now = new Date();
    const stations = await loadStations();
    const station = stations.reduce((nearest, candidate) =>
      distanceKm(latitude, longitude, candidate.latitude, candidate.longitude)
        < distanceKm(latitude, longitude, nearest.latitude, nearest.longitude) ? candidate : nearest);
    const today = dayJst(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const surveyUrl = new URL(SURVEY_URL);
    surveyUrl.searchParams.append("data_type", "0");
    surveyUrl.searchParams.append("data_type", "1");
    surveyUrl.searchParams.set("location_type", "1");
    surveyUrl.searchParams.set("wbgt_nos", String(station.no));
    surveyUrl.searchParams.set("date_from", compactJst(new Date(Date.UTC(jstParts(yesterday).year, jstParts(yesterday).month - 1, jstParts(yesterday).day, -9))));
    surveyUrl.searchParams.set("date_to", compactJst(now));

    const forecastUrl = new URL(FORECAST_URL);
    forecastUrl.searchParams.set("location_type", "1");
    forecastUrl.searchParams.set("date_search_type", "2");
    forecastUrl.searchParams.set("wbgt_nos", String(station.no));
    forecastUrl.searchParams.set("fixed_time_dates", today);

    const [surveyRows, forecastRows] = await Promise.all([
      fetchOfficialJson(surveyUrl), fetchOfficialJson(forecastUrl),
    ]);

    const currentRows = surveyRows.filter((row: any) => row.wbgt_WO !== null && String(row.wbgt_WO).trim() !== "")
      .map((row: any) => ({
        ...row, parsedDate: parseOfficialJst(row.wbgt_date), value: Number(row.wbgt_WO),
      })).filter((row: any) => row.parsedDate && row.parsedDate <= now && Number.isFinite(row.value))
      .sort((a: any, b: any) => b.parsedDate.getTime() - a.parsedDate.getTime() || b.wbgt_class - a.wbgt_class);
    const current = currentRows[0];
    if (!current || now.getTime() - current.parsedDate.getTime() > 3 * 60 * 60 * 1000) {
      return json({ error: "stale_or_missing", message: "暑さ指数を取得できませんでした" }, 503);
    }

    const validForecasts = forecastRows.filter((row: any) => row.forecast_val !== null && String(row.forecast_val).trim() !== "")
      .map((row: any) => ({
      ...row,
      referenceDate: parseOfficialJst(row.reference_time),
      forecastDate: parseOfficialJst(row.forecast_time),
      value: Number(row.forecast_val) / 10,
    })).filter((row: any) => row.referenceDate && row.forecastDate && row.referenceDate <= now
      && Number.isFinite(row.value) && Number(row.flag) === 0);
    const latestReference = validForecasts.reduce((latest: Date | null, row: any) =>
      !latest || row.referenceDate > latest ? row.referenceDate : latest, null);
    const latestForecasts = latestReference ? validForecasts.filter((row: any) =>
      row.referenceDate.getTime() === latestReference.getTime() && dayJst(row.forecastDate) === today) : [];
    const todayObserved = currentRows.filter((row: any) => dayJst(row.parsedDate) === today);
    const todayCandidates = [
      ...todayObserved.map((row: any) => row.value),
      ...latestForecasts.map((row: any) => row.value),
    ];
    const todayMax = todayCandidates.length ? Math.max(...todayCandidates) : null;
    const currentLevel = levelFor(current.value);
    const maxLevel = todayMax === null ? null : levelFor(todayMax);

    return json({
      station: { ...station, distanceKm: Math.round(distanceKm(latitude, longitude, station.latitude, station.longitude) * 10) / 10 },
      current: { value: current.value, observedAt: current.wbgt_date, measured: Number(current.wbgt_class) === 1, ...currentLevel },
      todayMax: todayMax === null ? null : { value: todayMax, level: maxLevel?.level, label: "本日の最高見込み" },
      forecastUpdatedAt: latestReference ? latestReference.toISOString() : null,
      source: { name: "環境省", url: "https://www.wbgt.env.go.jp/" },
      note: "現在地周辺の最寄り情報提供地点を基準にした目安です。日差しや地面からの照り返しなどで実際の状況と異なる場合があります。",
    });
  } catch (_error) {
    return json({ error: "upstream_failure", message: "暑さ指数を取得できませんでした" }, 503);
  }
});
