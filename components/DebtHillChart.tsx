"use client";

import { useRef, useState } from "react";
import type { DailyRecord } from "@/lib/sleep";
import { TARGET_HOURS, formatDateShort } from "@/lib/sleep";

type Props = {
  records: DailyRecord[];
  targetHours?: number;
};

const W = 760;
const H = 340;
const PAD = { left: 46, right: 16, top: 22, bottom: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const GREEN = "#10b981";
const GREEN_SOFT = "#a7f3d0";
const RED = "#ef4444";
const RED_SOFT = "#fecaca";
const LINE = "#334155";
const GRID = "#e2e8f0";
const ZERO = "#94a3b8";

export default function DebtHillChart({ records, targetHours = TARGET_HOURS }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (records.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        还没有记录，先记一笔今天的睡眠吧 👇
      </div>
    );
  }

  const n = records.length;
  const cums = records.map((r) => r.cumulative);
  const rawMin = Math.min(0, ...cums);
  const rawMax = Math.max(0, ...cums);
  const span = rawMax - rawMin || 1;
  const padV = span * 0.12;
  const minV = rawMin - padV;
  const maxV = rawMax + padV;

  const xFor = (i: number) =>
    n === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W;
  const yFor = (v: number) =>
    PAD.top + ((maxV - v) / (maxV - minV)) * PLOT_H;
  const zeroY = yFor(0);

  // 绿色（盈余，>=0）区域：仅在累计>0 处填充到零轴
  let greenD = `M ${xFor(0)} ${zeroY}`;
  for (let i = 0; i < n; i++) {
    const y = records[i].cumulative >= 0 ? yFor(records[i].cumulative) : zeroY;
    greenD += ` L ${xFor(i)} ${y}`;
  }
  greenD += ` L ${xFor(n - 1)} ${zeroY} Z`;

  // 红色（债务，<=0）区域：仅在累计<0 处填充到零轴
  let redD = `M ${xFor(0)} ${zeroY}`;
  for (let i = 0; i < n; i++) {
    const y = records[i].cumulative <= 0 ? yFor(records[i].cumulative) : zeroY;
    redD += ` L ${xFor(i)} ${y}`;
  }
  redD += ` L ${xFor(n - 1)} ${zeroY} Z`;

  // 累计折线
  let lineD = `M ${xFor(0)} ${yFor(records[0].cumulative)}`;
  for (let i = 1; i < n; i++) lineD += ` L ${xFor(i)} ${yFor(records[i].cumulative)}`;

  // x 轴刻度（约 6 个）
  const ticks: number[] = [];
  const tickCount = Math.min(6, n);
  for (let t = 0; t < tickCount; t++) {
    ticks.push(Math.round((t / (tickCount - 1)) * (n - 1)));
  }

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    setHover(i);
  };

  const hv = hover != null ? records[hover] : null;
  const hx = hover != null ? xFor(hover) : 0;
  const hy = hover != null ? yFor(records[hover].cumulative) : 0;

  // tooltip 定位（避免越界）
  const tipW = 156;
  const tipX = Math.max(PAD.left, Math.min(W - PAD.right - tipW, hx - tipW / 2));
  const tipY = Math.max(PAD.top, hy - 86);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label="睡眠债务山丘图"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* 网格与零轴 */}
        <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke={ZERO} strokeWidth={1.2} strokeDasharray="4 4" />
        <text x={PAD.left - 8} y={zeroY + 4} textAnchor="end" fontSize={11} fill={ZERO}>
          0
        </text>
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" fontSize={11} fill={GREEN}>
          +{Math.round(maxV)}
        </text>
        <text x={PAD.left - 8} y={H - PAD.bottom} textAnchor="end" fontSize={11} fill={RED}>
          {Math.round(minV)}
        </text>
        <text x={PAD.left - 8} y={(PAD.top + (H - PAD.bottom)) / 2} textAnchor="end" fontSize={10} fill="#cbd5e1">
          h
        </text>

        {/* 面积 */}
        <path d={redD} fill={RED_SOFT} />
        <path d={greenD} fill={GREEN_SOFT} />
        {/* 累计折线 */}
        <path d={lineD} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" />

        {/* x 轴刻度 */}
        {ticks.map((i) => (
          <text key={i} x={xFor(i)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize={11} fill="#94a3b8">
            {formatDateShort(records[i].date)}
          </text>
        ))}

        {/* hover 指示 */}
        {hv && (
          <g>
            <line x1={hx} y1={PAD.top} x2={hx} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />
            <circle cx={hx} cy={hy} r={4} fill={hv.cumulative >= 0 ? GREEN : RED} stroke="#fff" strokeWidth={1.5} />
            <g transform={`translate(${tipX}, ${tipY})`}>
              <rect width={tipW} height={74} rx={8} fill="#0f172a" opacity={0.92} />
              <text x={10} y={20} fontSize={12} fill="#e2e8f0" fontWeight={600}>
                {hv.date}
              </text>
              <text x={10} y={38} fontSize={11} fill="#cbd5e1">
                睡眠 {hv.recorded ? `${hv.hours}h` : "未记录"}
              </text>
              <text x={10} y={54} fontSize={11} fill={hv.balance >= 0 ? GREEN_SOFT : RED_SOFT}>
                当日 {hv.balance >= 0 ? "+" : ""}
                {hv.recorded ? hv.balance.toFixed(1) : "0.0"}h
              </text>
              <text x={10} y={70} fontSize={11} fill="#e2e8f0">
                累计 {hv.cumulative >= 0 ? "+" : ""}
                {hv.cumulative.toFixed(1)}h
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* 图例 */}
      <div className="mt-1 flex items-center justify-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: GREEN_SOFT, border: `1px solid ${GREEN}` }} />
          盈余（已存下）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: RED_SOFT, border: `1px solid ${RED}` }} />
          睡眠债（欠身体）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: ZERO }} />
          {targetHours}h 基准线
        </span>
      </div>
    </div>
  );
}
