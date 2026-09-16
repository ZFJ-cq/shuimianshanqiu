"use client";

import { useEffect, useState } from "react";
import {
  MAX_HOURS,
  TARGET_HOURS,
  clampHours,
  durationHours,
  nowHM,
  todayKey,
  type SleepEntry,
} from "@/lib/sleep";

type Props = {
  entries: SleepEntry[];
  onSave: (
    date: string,
    hours: number,
    bedtime?: string | null,
    waketime?: string | null
  ) => void;
  onDelete: (date: string) => void;
};

const PRESETS = [4, 5, 6, 7, 8, 9];

export default function SleepEntryForm({ entries, onSave, onDelete }: Props) {
  const [date, setDate] = useState(todayKey());
  const [hours, setHours] = useState(TARGET_HOURS);
  const [bedtime, setBedtime] = useState<string | null>(null);
  const [waketime, setWaketime] = useState<string | null>(null);

  // 切换日期或记录变化时，带入已有值
  useEffect(() => {
    const ex = entries.find((e) => e.date === date);
    setHours(ex ? ex.hours : TARGET_HOURS);
    setBedtime(ex?.bedtime ?? null);
    setWaketime(ex?.waketime ?? null);
  }, [date, entries]);

  const existing = entries.find((e) => e.date === date) || null;
  const isToday = date === todayKey();
  const bothTimes = !!bedtime && !!waketime;
  const computed = bothTimes ? durationHours(bedtime!, waketime!) : null;

  // 两个时间都齐了 → 时长由打卡决定（四舍五入 0.5h）
  useEffect(() => {
    if (computed != null) setHours(clampHours(computed));
  }, [computed]);

  const shown = computed ?? hours;
  const diff = shown - TARGET_HOURS;

  const checkInBed = () => {
    const t = nowHM();
    setBedtime(t);
    if (waketime) setHours(clampHours(durationHours(t, waketime)));
  };
  const checkInWake = () => {
    const t = nowHM();
    setWaketime(t);
    if (bedtime) setHours(clampHours(durationHours(bedtime, t)));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-800">记录今日睡眠</h2>

      <div className="mb-4 flex items-end gap-3">
        <label className="flex flex-col text-xs font-medium text-slate-500">
          日期（取入睡当天）
          <input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
        </label>
        {!isToday && (
          <span className="mb-2 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
            历史补录
          </span>
        )}
        {existing && (
          <span className="mb-2 ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-600">
            已有记录
          </span>
        )}
      </div>

      {/* 打卡区 */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={checkInBed}
          className={`rounded-xl border px-3 py-3 text-left transition ${
            bedtime
              ? "border-indigo-300 bg-indigo-50"
              : "border-slate-200 hover:border-indigo-300"
          }`}
        >
          <div className="text-xs text-slate-400">🌙 睡眠打卡</div>
          <div
            className={`mt-0.5 text-base font-semibold ${
              bedtime ? "text-indigo-600" : "text-slate-400"
            }`}
          >
            {bedtime || "点此记录入睡"}
          </div>
        </button>
        <button
          type="button"
          onClick={checkInWake}
          className={`rounded-xl border px-3 py-3 text-left transition ${
            waketime
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="text-xs text-slate-400">☀️ 早起打卡</div>
          <div
            className={`mt-0.5 text-base font-semibold ${
              waketime ? "text-amber-600" : "text-slate-400"
            }`}
          >
            {waketime || "点此记录起床"}
          </div>
        </button>
      </div>

      {(bedtime || waketime) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <label className="flex items-center gap-1">
            入睡
            <input
              type="time"
              value={bedtime ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setBedtime(v);
                if (v && waketime) setHours(clampHours(durationHours(v, waketime)));
              }}
              className="rounded border border-slate-300 px-2 py-1 text-slate-700"
            />
          </label>
          <label className="flex items-center gap-1">
            起床
            <input
              type="time"
              value={waketime ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setWaketime(v);
                if (bedtime && v) setHours(clampHours(durationHours(bedtime, v)));
              }}
              className="rounded border border-slate-300 px-2 py-1 text-slate-700"
            />
          </label>
          {bothTimes && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
              由打卡自动计算
            </span>
          )}
        </div>
      )}

      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums text-slate-800">
          {shown.toFixed(1)}
        </span>
        <span className="text-sm text-slate-400">小时</span>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
            diff >= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {diff >= 0 ? `盈余 +${diff.toFixed(1)}h` : `亏空 ${diff.toFixed(1)}h`}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={MAX_HOURS}
        step={0.5}
        value={hours}
        disabled={bothTimes}
        onChange={(e) => setHours(clampHours(Number(e.target.value)))}
        className="w-full accent-indigo-500 disabled:opacity-40"
      />
      <div className="mt-1 flex justify-between px-0.5 text-[10px] text-slate-300">
        <span>0</span>
        <span>{TARGET_HOURS}</span>
        <span>{MAX_HOURS}</span>
      </div>
      {bothTimes && (
        <p className="mt-1 text-[11px] text-slate-400">
          已按打卡时间自动算出时长，拖动滑块可手动微调（将覆盖打卡结果）。
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            disabled={bothTimes}
            onClick={() => setHours(p)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40"
          >
            {p}h
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => onSave(date, hours, bedtime, waketime)}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          {existing ? "更新记录" : "保存记录"}
        </button>
        {existing && (
          <button
            onClick={() => onDelete(date)}
            className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-50"
          >
            删除
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        数据仅保存在本机浏览器（localStorage），不会上传任何服务器。
      </p>
    </div>
  );
}
