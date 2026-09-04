"use client";

import React, { useState } from "react";

// --- Line Chart Component (Distinct Shades of Black & Monochromatic Styles) ---
export interface LineSeries {
  name: string;
  color?: string;
  dashStyle?: string; // "solid" | "dashed" | "dotted"
  data: { label: string; value: number }[];
}

export function LineChart({
  series,
  height = 240,
  valuePrefix = "₹",
  formatValue = (v: number) => `${valuePrefix}${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}: {
  series: LineSeries[];
  height?: number;
  valuePrefix?: string;
  formatValue?: (v: number) => string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400 font-medium">
        Not enough historical trend data points yet.
      </div>
    );
  }

  const labels = series[0].data.map(d => d.label);
  const pointCount = labels.length;

  let maxVal = 0;
  series.forEach(s => {
    s.data.forEach(d => {
      if (d.value > maxVal) maxVal = d.value;
    });
  });
  if (maxVal === 0) maxVal = 100;

  const padding = { top: 20, right: 20, bottom: 35, left: 55 };
  const width = 600;
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (pointCount <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (pointCount - 1)) * graphWidth;
  };

  const getY = (val: number) => {
    return padding.top + graphHeight - (val / maxVal) * graphHeight;
  };

  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  // Distinct shades of black & dark charcoal with specific stroke patterns
  const seriesStyles = [
    { color: "#09090b", dash: undefined, labelStyle: "Solid Pitch Black (#09090b)", circleFill: "#09090b", strokeWidth: 3 },
    { color: "#52525b", dash: "6 4", labelStyle: "Dashed Charcoal (#52525b)", circleFill: "#52525b", strokeWidth: 2.5 },
    { color: "#27272a", dash: "2 3", labelStyle: "Dotted Ink (#27272a)", circleFill: "#27272a", strokeWidth: 2.5 }
  ];

  return (
    <div className="w-full relative">
      {/* Legend with distinct line indicators */}
      <div className="flex flex-wrap items-center gap-5 mb-4 text-xs font-semibold text-zinc-800">
        {series.map((s, idx) => {
          const style = seriesStyles[idx % seriesStyles.length];
          const color = s.color || style.color;
          const dash = s.dashStyle === "dashed" ? "6 4" : s.dashStyle === "dotted" ? "2 3" : (s.dashStyle === "solid" ? undefined : style.dash);

          return (
            <div key={s.name} className="flex items-center gap-2">
              <svg width="24" height="12" className="overflow-visible">
                <line
                  x1="0"
                  y1="6"
                  x2="24"
                  y2="6"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray={dash}
                />
                <circle cx="12" cy="6" r="3" fill="#ffffff" stroke={color} strokeWidth="2" />
              </svg>
              <span className="text-zinc-900 font-bold">{s.name}</span>
            </div>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Y Axis Grid lines & labels */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e4e4e7"
                strokeDasharray={i === 0 ? undefined : "3 3"}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-zinc-500 font-sans font-medium"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {labels.map((lbl, i) => {
          const x = getX(i);
          const step = Math.max(1, Math.floor(pointCount / 6));
          if (i % step !== 0 && i !== pointCount - 1) return null;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-zinc-500 font-sans font-medium"
            >
              {lbl}
            </text>
          );
        })}

        {/* Lines and Area Fills */}
        {series.map((s, idx) => {
          const defaultStyle = seriesStyles[idx % seriesStyles.length];
          const color = s.color || defaultStyle.color;
          const dash = s.dashStyle === "dashed" ? "6 4" : s.dashStyle === "dotted" ? "2 3" : (s.dashStyle === "solid" ? undefined : defaultStyle.dash);
          const strokeWidth = defaultStyle.strokeWidth;

          // Generate smooth bezier path
          let d = "";
          let fillD = "";
          s.data.forEach((pt, i) => {
            const x = getX(i);
            const y = getY(pt.value);
            if (i === 0) {
              d += `M ${x},${y}`;
              fillD += `M ${x},${padding.top + graphHeight} L ${x},${y}`;
            } else {
              const prevX = getX(i - 1);
              const prevY = getY(s.data[i - 1].value);
              const cx1 = prevX + (x - prevX) / 3;
              const cy1 = prevY;
              const cx2 = prevX + (x - prevX) / 1.5;
              const cy2 = y;
              d += ` C ${cx1},${cy1} ${cx2},${cy2} ${x},${y}`;
              fillD += ` C ${cx1},${cy1} ${cx2},${cy2} ${x},${y}`;
            }
          });
          
          if (fillD) {
             fillD += ` L ${getX(pointCount - 1)},${padding.top + graphHeight} Z`;
          }

          return (
            <g key={s.name}>
              {s.dashStyle === "solid" && (
                <path
                  d={fillD}
                  fill={color}
                  fillOpacity="0.05"
                  className="transition-all duration-300"
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dash}
                className="transition-all duration-300"
              />
              {s.data.map((pt, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(pt.value)}
                  r={hoveredIdx === i ? 5 : 3.5}
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="2.5"
                  className="transition-all duration-150"
                />
              ))}
            </g>
          );
        })}

        {/* Hover Vertical Guide Line */}
        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={padding.top}
            x2={getX(hoveredIdx)}
            y2={padding.top + graphHeight}
            stroke="#18181b"
            strokeDasharray="2 2"
          />
        )}

        {/* Overlay Rectangles for Smooth Hover */}
        {labels.map((_, i) => {
          const x = getX(i);
          const colWidth = graphWidth / Math.max(1, pointCount - 1);
          return (
            <rect
              key={i}
              x={x - colWidth / 2}
              y={padding.top}
              width={colWidth}
              height={graphHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>

      {/* Tooltip Overlay (Shades of Dark Charcoal) */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 pointer-events-none bg-zinc-950 text-white p-3 rounded-xl shadow-2xl text-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full mb-2 border border-zinc-800"
          style={{
            left: `${((getX(hoveredIdx) - padding.left) / graphWidth) * 80 + 10}%`,
            top: `${(getY(series[0].data[hoveredIdx].value) / height) * 100}%`
          }}
        >
          <div className="font-bold text-zinc-300 border-b border-zinc-800 pb-1 mb-1 flex justify-between">
            <span>{labels[hoveredIdx]}</span>
            <span className="text-[10px] text-zinc-400 font-mono">AUDIT</span>
          </div>
          {series.map((s, idx) => {
            const defaultStyle = seriesStyles[idx % seriesStyles.length];
            const color = s.color || defaultStyle.color;
            return (
              <div key={s.name} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-zinc-700" style={{ backgroundColor: color }}></span>
                  <span className="text-zinc-400 font-medium">{s.name}:</span>
                </span>
                <span className="font-bold text-white">{formatValue(s.data[hoveredIdx].value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Horizontal Bar Chart Component (Shades of Black) ---
export interface BarItem {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue: string;
  secondaryValue?: string;
  color?: string;
  badgeText?: string;
  onClick?: () => void;
}

export function HorizontalBarChart({
  items,
  title
}: {
  items: BarItem[];
  title?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400 font-medium">
        No active data categories to display.
      </div>
    );
  }

  const maxVal = Math.max(...items.map(i => i.value), 1);

  // Shades of black for bars (darkest for highest impact)
  const barShades = ["#09090b", "#27272a", "#3f3f46", "#52525b"];

  return (
    <div className="space-y-3">
      {title && <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{title}</h4>}
      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const percent = Math.min(100, Math.max(4, (item.value / maxVal) * 100));
          const fillColor = item.color || barShades[idx % barShades.length];
          return (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-black transition-all ${
                item.onClick ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-black truncate">{item.label}</span>
                  {item.sublabel && <span className="text-zinc-500 truncate text-[11px]">({item.sublabel})</span>}
                  {item.badgeText && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-black border border-zinc-300">
                      {item.badgeText}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-black">{item.formattedValue}</span>
                  {item.secondaryValue && (
                    <span className="text-zinc-500 text-[11px] block font-medium">{item.secondaryValue}</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%`, backgroundColor: fillColor }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Strategy Comparison Table (Shades of Black & Monochromatic Hierarchy) ---
export interface StrategyComparison {
  strategy: string;
  attempts: number;
  recoveryRate: number;
  grossRecovered: number;
  incentiveCost: number;
  netRecovered: number;
}

export function StrategyComparisonVisual({
  data
}: {
  data: StrategyComparison[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
        Insufficient strategy outcome records to display comparison.
      </div>
    );
  }

  const maxNet = Math.max(...data.map(d => d.netRecovered), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs divide-y divide-zinc-200">
        <thead>
          <tr className="bg-zinc-100 text-zinc-700 uppercase tracking-wider text-[10px] font-bold">
            <th className="py-2.5 px-3">Strategy</th>
            <th className="py-2.5 px-3 text-right">Attempts</th>
            <th className="py-2.5 px-3 text-right">Recovery Rate</th>
            <th className="py-2.5 px-3 text-right">Gross Recovered</th>
            <th className="py-2.5 px-3 text-right">Incentive Cost</th>
            <th className="py-2.5 px-3 text-right">NET RECOVERED</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white">
          {data.map(item => {
            const isTopNet = item.netRecovered === maxNet && item.netRecovered > 0;
            return (
              <tr key={item.strategy} className={`hover:bg-zinc-50 transition-colors ${isTopNet ? "bg-zinc-100/60" : ""}`}>
                <td className="py-3 px-3 font-bold text-black flex items-center gap-2">
                  <span>{item.strategy.replace(/_/g, " ")}</span>
                  {isTopNet && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-950 text-white uppercase tracking-wider border border-black">
                      Top Net ROI
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-zinc-700">{item.attempts}</td>
                <td className="py-3 px-3 text-right font-bold text-black">
                  {(item.recoveryRate * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-right text-zinc-800 font-semibold">
                  ₹{(item.grossRecovered / 100).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-3 text-right text-zinc-600 font-medium">
                  {item.incentiveCost > 0 ? `-₹${(item.incentiveCost / 100).toLocaleString("en-IN")}` : "₹0"}
                </td>
                <td className="py-3 px-3 text-right font-bold text-black">
                  <span className={item.netRecovered > 0 ? "font-bold text-black" : "text-zinc-400"}>
                    ₹{(item.netRecovered / 100).toLocaleString("en-IN")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
