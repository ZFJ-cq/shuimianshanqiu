"use client";

import { TARGET_HOURS } from "@/lib/sleep";
import type { Summary } from "@/lib/sleep";

type Props = {
  summary: Summary;
};

function Card({
  label,
  value,
  unit,
  tone,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "debt" | "surplus" | "neutral" | "warn";
  sub?: string;
}) {
  const toneCls = {
    debt: "from-rose-50 to-rose-100/40 text-rose-600",
    surplus: "from-emerald-50 to-emerald-100/40 text-emerald-600",
    neutral: "from-slate-50 to-slate-100/40 text-slate-700",
    warn: "from-amber-50 to-amber-100/40 text-amber-600",
  }[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${toneCls} p-4 shadow-sm`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] leading-tight text-slate-500">{sub}</div>}
    </div>
  );
}

export default function StatsCards({ summary }: Props) {
  const { currentDebt, surplus, longestStreak, todaySuggestion, remaining, avgSleep, recordedDays, totalDays } = summary;

  const hasSurplus = surplus > 0 && currentDebt === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Card
        label={`当前睡眠债（近 ${summary.rangeDays} 天）`}
        value={hasSurplus ? "0.0" : currentDebt.toFixed(1)}
        unit="h"
        tone={hasSurplus ? "surplus" : "debt"}
        sub={
          hasSurplus
            ? `已多睡 +${surplus.toFixed(1)}h，身体有盈余 🎉`
            : remaining > 0
            ? `还差 ${remaining.toFixed(1)}h，分几天补回来`
            : "每少睡 1h 都在欠身体觉"
        }
      />
      <Card
        label="最长连亏天数"
        value={String(longestStreak)}
        unit="天"
        tone={longestStreak >= 3 ? "warn" : "neutral"}
        sub={longestStreak >= 3 ? "连续熬夜偏久，要注意" : "连续亏空的天数"}
      />
      <Card
        label="今日建议补觉"
        value={todaySuggestion.toFixed(1)}
        unit="h"
        tone={todaySuggestion > 0 ? "warn" : "surplus"}
        sub={
          todaySuggestion > 0
            ? `今晚目标约 ${TARGET_HOURS + todaySuggestion}h（含 7h 底线）`
            : "已达标，今晚睡满 7h 即可 💤"
        }
      />

      <div className="col-span-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 shadow-sm sm:col-span-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            区间内平均睡眠：<b className="text-slate-700">{avgSleep > 0 ? avgSleep.toFixed(1) : "—"}</b> h
          </span>
          <span>
            记录完整度：<b className="text-slate-700">{recordedDays}</b>/{totalDays} 天
          </span>
          <span>
            区间：<b className="text-slate-700">{summary.startDate}</b> ~ {summary.endDate}
          </span>
        </div>
      </div>
    </div>
  );
}
