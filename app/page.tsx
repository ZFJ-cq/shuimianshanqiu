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
  MAX_MAKEUP_TODAY,
  type SleepEntry,
} from "@/lib/sleep";

export default function Home() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [range, setRange] = useState<7 | 30>(7);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // 保存/删除后短暂提示
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const records = useMemo(() => buildRecords(entries), [entries]);
  const rangeRecords = useMemo(() => sliceRange(records, range), [records, range]);
  const summary = useMemo(() => summarize(records, range), [records, range]);

  const recentEntries = useMemo(
    () => [...entries].slice(-7).reverse(),
    [entries]
  );

  // 顶部一句话总结（大白话）
  const insight = useMemo(() => {
    const s = summary;
    if (s.recordedDays === 0) return null;
    if (s.currentDebt > 0) {
      const sup = Math.min(s.currentDebt, MAX_MAKEUP_TODAY);
      return `你目前欠身体 ${s.currentDebt.toFixed(1)}h 睡眠债。今晚建议早点睡，争取补回约 ${sup.toFixed(1)}h。`;
    }
    if (s.surplus > 0) {
      return `状态不错！近 ${s.rangeDays} 天已盈余 ${s.surplus.toFixed(1)}h，保持每天 7h 即可。`;
    }
    return `刚好达标，每天睡满 7h 就不欠身体觉。`;
  }, [summary]);

  const handleSave = (
    date: string,
    hours: number,
    bedtime?: string | null,
    waketime?: string | null
  ) => {
    const wasExisting = entries.some((e) => e.date === date);
    const next = upsertEntry(entries, date, hours, bedtime, waketime);
    setEntries(next);
    saveEntries(next);
    setToast(wasExisting ? `已更新 ${date} 的睡眠记录` : `已保存 ${date} 的睡眠记录`);
  };
  const handleDelete = (date: string) => {
    const next = upsertEntry(entries, date, null);
    setEntries(next);
    saveEntries(next);
    setToast(`已删除 ${date} 的记录`);
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
          {insight && (
            <div
              className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                summary.currentDebt > 0
                  ? "bg-rose-50 text-rose-600"
                  : summary.surplus > 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {summary.currentDebt > 0 ? "⚠️ " : summary.surplus > 0 ? "✅ " : "💡 "}
              {insight}
            </div>
          )}
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
            {entries.length === 0 && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
                <div className="text-sm font-semibold text-indigo-700">第一次用？三步就开始 👇</div>
                <ol className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <li>① 左侧日期选好（默认今天），点「🌙 睡眠打卡」</li>
                  <li>② 早上起来点「☀️ 早起打卡」，自动算出今晚睡了多久</li>
                  <li>③ 看右边的山丘：红 = 欠身体的觉，绿 = 存下的盈余</li>
                </ol>
                <p className="mt-2 text-[11px] text-slate-400">数据只存在本机浏览器，换设备不会同步。</p>
              </div>
            )}
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

        {/* 保存/删除 成功提示 */}
        {toast && (
          <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
