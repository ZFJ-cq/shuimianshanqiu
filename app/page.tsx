"use client";

import { useEffect, useMemo, useState } from "react";
import SleepEntryForm from "@/components/SleepEntryForm";
import StatsCards from "@/components/StatsCards";
import DebtHillChart from "@/components/DebtHillChart";
import {
  buildRecords,
  loadEntries,
  saveEntries,
  sliceRange,
  summarize,
  upsertEntry,
  type SleepEntry,
} from "@/lib/sleep";

export default function Home() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [range, setRange] = useState<7 | 30>(7);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const records = useMemo(() => buildRecords(entries), [entries]);
  const rangeRecords = useMemo(() => sliceRange(records, range), [records, range]);
  const summary = useMemo(() => summarize(records, range), [records, range]);

  const recentEntries = useMemo(
    () => [...entries].slice(-7).reverse(),
    [entries]
  );

  const handleSave = (
    date: string,
    hours: number,
    bedtime?: string | null,
    waketime?: string | null
  ) => {
    const next = upsertEntry(entries, date, hours, bedtime, waketime);
    setEntries(next);
    saveEntries(next);
  };
  const handleDelete = (date: string) => {
    const next = upsertEntry(entries, date, null);
    setEntries(next);
    saveEntries(next);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40 px-4 py-8 print:bg-white print:py-2">
      <div className="mx-auto max-w-5xl">
        {/* 顶部标题 */}
        <header className="mb-6 print:mb-2">
          <div className="print-only mb-1 text-xs text-slate-400">
            睡眠债务周报 · 生成于 {new Date().toLocaleDateString("zh-CN")}
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
            <span>🌄</span> 睡眠债务山丘
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            每天记一下睡了几小时，把「睡眠债」画成一座会涨会退的山丘。
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* 左：录入 + 操作 */}
          <div className="no-print space-y-5">
            <SleepEntryForm entries={entries} onSave={handleSave} onDelete={handleDelete} />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-700">时间范围</div>
              <div className="flex rounded-xl bg-slate-100 p-1">
                {([7, 30] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      range === r
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    近 {r} 天
                  </button>
                ))}
              </div>
              <button
                onClick={() => window.print()}
                className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
              >
                📄 导出 PDF 睡眠周报
              </button>
            </div>
          </div>

          {/* 右：统计 + 图表 */}
          <div className="space-y-5">
            <StatsCards summary={summary} />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">
                  睡眠债务山丘图（近 {range} 天）
                </h2>
                <span className="text-xs text-slate-400">悬停查看每日明细</span>
              </div>
              <DebtHillChart records={rangeRecords} />
            </div>

            {/* 打印用：近期记录表 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:block">
              <h2 className="mb-3 text-base font-semibold text-slate-800">近期记录</h2>
              {recentEntries.length === 0 ? (
                <p className="text-sm text-slate-400">暂无记录。</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                      <th className="py-2">日期</th>
                      <th className="py-2">入睡</th>
                      <th className="py-2">起床</th>
                      <th className="py-2">睡眠</th>
                      <th className="py-2">当日</th>
                      <th className="py-2">累计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map((e) => {
                      const rec = records.find((r) => r.date === e.date);
                      const bal = e.hours - 7;
                      return (
                        <tr key={e.date} className="border-b border-slate-100">
                          <td className="py-2 text-slate-600">{e.date}</td>
                          <td className="py-2 text-slate-600">{e.bedtime ?? "—"}</td>
                          <td className="py-2 text-slate-600">{e.waketime ?? "—"}</td>
                          <td className="py-2 text-slate-700">{e.hours}h</td>
                          <td
                            className={`py-2 ${
                              bal >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {bal >= 0 ? "+" : ""}
                            {bal.toFixed(1)}h
                          </td>
                          <td className="py-2 text-slate-600">
                            {rec ? `${rec.cumulative >= 0 ? "+" : ""}${rec.cumulative.toFixed(1)}h` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <footer className="no-print mt-8 text-center text-xs text-slate-400">
          纯前端 · 数据存于本地浏览器 · 适合 GitHub Pages 静态部署
        </footer>
      </div>
    </main>
  );
}
