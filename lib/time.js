const SEOUL_TZ = "Asia/Seoul";

export function seoulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${map.year}${map.month}${map.day}`;
}

export function utcMinuteBucket(date = new Date()) {
  return Math.floor(date.getTime() / 60000);
}

export function recentDateKeys(days = 30, now = new Date()) {
  const result = [];
  for (let index = 0; index < days; index += 1) {
    result.push(seoulDateKey(new Date(now.getTime() - index * 86400000)));
  }
  return result;
}

export function rankingWeights(days = 30) {
  return Array.from({ length: days }, (_, index) => index === 0 ? 5 : index <= 6 ? 3 : 1);
}

export function fiveMinuteBucket(date = new Date()) {
  return Math.floor(date.getTime() / (5 * 60000));
}
