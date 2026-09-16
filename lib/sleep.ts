// 睡眠债务核心逻辑层
// 纯函数 + localStorage 持久化，无后端。

export const TARGET_HOURS = 7; // 目标基准线（小时/天）
export const MAX_HOURS = 12; // 单日录入上限
export const MAX_MAKEUP_TODAY = 5; // 单日建议补觉上限（超出则提示分多日）

export type SleepEntry = {
  date: string; // YYYY-MM-DD（本地日期，取「入睡当天」）
  hours: number; // 0–12，由打卡或手动得出
  bedtime?: string | null; // 入睡时间 "HH:MM"
  waketime?: string | null; // 起床时间 "HH:MM"（可能跨天）
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type DailyRecord = {
  date: string;
  hours: number | null; // null = 当天未记录
  recorded: boolean;
  balance: number; // 当天盈余/亏空 = hours - TARGET（未记录记为 0）
  cumulative: number; // 自首次记录以来的累计余额（盈余为正、债务为负）
};

export type Summary = {
  rangeDays: number;
  startDate: string;
  endDate: string;
  currentDebt: number; // 当前睡眠债（小时，>=0）
  surplus: number; // 当前盈余（小时，>=0）
  cumulativeEnd: number; // 区间末累计值（正=盈余，负=债务）
  longestStreak: number; // 区间内最长连亏天数
  todaySuggestion: number; // 今日建议额外补觉时长（小时）
  remaining: number; // 超过单日上限、需分多日补足的部分
  avgSleep: number; // 区间内「已记录」日子的平均睡眠
  recordedDays: number; // 区间内已记录天数
  totalDays: number; // 区间总天数
};

const STORAGE_KEY = "sleep-debt-hill:entries:v1";

// ---------- 日期工具 ----------
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, delta: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return todayKey(d);
}

export function formatDateShort(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function clampHours(h: number): number {
  if (!Number.isFinite(h)) return 0;
  const rounded = Math.round(h * 2) / 2; // 0.5 步进
  return Math.min(MAX_HOURS, Math.max(0, rounded));
}

// ---------- 持久化 ----------
export function loadEntries(): SleepEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e: any) =>
          typeof e?.date === "string" && Number.isFinite(e?.hours)
      )
      .map((e: any) => ({
        date: e.date,
        hours: clampHours(e.hours),
        bedtime: typeof e?.bedtime === "string" && TIME_RE.test(e.bedtime) ? e.bedtime : null,
        waketime: typeof e?.waketime === "string" && TIME_RE.test(e.waketime) ? e.waketime : null,
      }))
      .sort((a: SleepEntry, b: SleepEntry) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export function saveEntries(entries: SleepEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** 按日期写入/更新/删除（hours 为 null 时删除该日记录）。 */
export function upsertEntry(
  entries: SleepEntry[],
  date: string,
  hours: number | null,
  bedtime?: string | null,
  waketime?: string | null
): SleepEntry[] {
  const next = entries.filter((e) => e.date !== date);
  if (hours !== null)
    next.push({
      date,
      hours: clampHours(hours),
      bedtime: bedtime ?? null,
      waketime: waketime ?? null,
    });
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- 打卡辅助 ----------
/** 当前本地时间 "HH:MM"。 */
export function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** 由入睡/起床时间计算睡眠时长（小时），自动处理跨天。 */
export function durationHours(bedtime: string, waketime: string): number {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(waketime) - toMin(bedtime);
  if (diff <= 0) diff += 24 * 60; // 跨午夜
  return diff / 60;
}

// ---------- 计算 ----------
/**
 * 构建从首次记录日到今天的连续日历序列。
 * 未记录的日子 balance=0（不计入债务变动，但会断开连亏 streak）。
 */
export function buildRecords(
  entries: SleepEntry[],
  endDate: string = todayKey()
): DailyRecord[] {
  if (entries.length === 0) return [];
  const map = new Map(entries.map((e) => [e.date, e.hours]));
  const start = entries[0].date;
  const records: DailyRecord[] = [];
  let cumulative = 0;

  let cur = new Date(start + "T00:00:00");
  const stop = new Date(endDate + "T00:00:00");
  while (cur <= stop) {
    const key = todayKey(cur);
    const recorded = map.has(key);
    const hours = recorded ? map.get(key)! : null;
    const balance = recorded ? hours! - TARGET_HOURS : 0;
    cumulative += balance;
    records.push({ date: key, hours, recorded, balance, cumulative });
    cur.setDate(cur.getDate() + 1);
  }
  return records;
}

/** 取最近 rangeDays 天（含今天）的记录切片。 */
export function sliceRange(
  records: DailyRecord[],
  rangeDays: number,
  endDate: string = todayKey()
): DailyRecord[] {
  const start = addDays(endDate, -(rangeDays - 1));
  return records.filter((r) => r.date >= start && r.date <= endDate);
}

export function summarize(
  records: DailyRecord[],
  rangeDays: number,
  endDate: string = todayKey()
): Summary {
  const start = addDays(endDate, -(rangeDays - 1));
  const inRange = records.filter((r) => r.date >= start && r.date <= endDate);
  const last = inRange[inRange.length - 1];
  const cumulativeEnd = last ? last.cumulative : 0;

  // 最长连亏：区间内连续「已记录且亏空」的日历天数
  let best = 0;
  let run = 0;
  for (const r of inRange) {
    if (r.recorded && r.balance < 0) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  const debt = Math.max(0, -cumulativeEnd);
  const surplus = Math.max(0, cumulativeEnd);
  const todaySuggestion = Math.min(debt, MAX_MAKEUP_TODAY);
  const remaining = Math.max(0, debt - MAX_MAKEUP_TODAY);

  const rec = inRange.filter((r) => r.recorded);
  const avgSleep = rec.length
    ? rec.reduce((s, r) => s + (r.hours || 0), 0) / rec.length
    : 0;

  return {
    rangeDays,
    startDate: start,
    endDate,
    currentDebt: debt,
    surplus,
    cumulativeEnd,
    longestStreak: best,
    todaySuggestion,
    remaining,
    avgSleep,
    recordedDays: rec.length,
    totalDays: inRange.length,
  };
}
