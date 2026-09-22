"use client";

/** Deterministic SVG charts. The AI provides structured data; geometry lives here. */

export function parseValues(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => {
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  });
}

function fmt(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${Math.round(n * 10) / 10}`;
}

export function SlideChart({
  chartType,
  labels,
  values,
  accent,
  accent2,
  text,
  muted,
}: {
  chartType: string;
  labels: string[];
  values: number[];
  accent: string;
  accent2: string;
  text: string;
  muted: string;
}) {
  const type = chartType === "line" || chartType === "donut" ? chartType : "bar";
  const n = Math.max(labels.length, values.length, 1);
  const labs = Array.from({ length: n }, (_, i) => labels[i] ?? `Item ${i + 1}`);
  const vals = Array.from({ length: n }, (_, i) => values[i] ?? 0);
  const max = Math.max(...vals, 1);

  if (type === "donut") {
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const R = 70;
    const C = 2 * Math.PI * R;
    let acc = 0;
    const palette = [accent, accent2, muted];
    return (
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
          {vals.map((v, i) => {
            const frac = v / total;
            const el = (
              <circle
                key={i}
                cx="90" cy="90" r={R} fill="none"
                stroke={palette[i % palette.length]}
                strokeWidth="26"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
                transform="rotate(-90 90 90)"
                strokeLinecap="butt"
              />
            );
            acc += frac;
            return el;
          })}
          <text x="90" y="86" textAnchor="middle" fill={text} fontSize="22" fontWeight="800">{fmt(vals[0] ?? 0)}</text>
          <text x="90" y="104" textAnchor="middle" fill={muted} fontSize="10">{labs[0] ?? ""}</text>
        </svg>
        <ul className="space-y-2">
          {labs.map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-sm" style={{ color: muted }}>
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: palette[i % palette.length] }} />
              <span className="truncate">{l}</span>
              <span className="font-semibold tabular-nums" style={{ color: text }}>{fmt(vals[i] ?? 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === "line") {
    const W = 560, H = 220, PAD = 30;
    const pts = vals.map((v, i) => {
      const x = n === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1);
      const y = H - PAD - (v / max) * (H - PAD * 2);
      return { x, y };
    });
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const gid = `lg-${Math.abs(hash(vals.join(","))) % 997}`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - 12} y1={H * f} y2={H * f} stroke={muted} strokeOpacity="0.25" strokeDasharray="3 5" />
        ))}
        <path d={`${path} L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD} Z`} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={accent} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fill={text} fontSize="12" fontWeight="700">{fmt(vals[i])}</text>
            <text x={p.x} y={H - 8} textAnchor="middle" fill={muted} fontSize="11">{labs[i]}</text>
          </g>
        ))}
      </svg>
    );
  }

  // bar
  const W = 560, H = 240, PAD = 30;
  const bw = Math.min(64, ((W - PAD * 2) / n) * 0.55);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} x2={W - 12} y1={H * f} y2={H * f} stroke={muted} strokeOpacity="0.25" strokeDasharray="3 5" />
      ))}
      {vals.map((v, i) => {
        const h = Math.max(6, (v / max) * (H - PAD * 2 - 30));
        const x = PAD + (i * (W - PAD * 2)) / n + ((W - PAD * 2) / n - bw) / 2;
        const y = H - PAD - 22 - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="6" fill={i === 0 ? muted : accent} opacity={i === 0 ? 0.55 : v === max ? 1 : 0.8} />
            <text x={x + bw / 2} y={y - 8} textAnchor="middle" fill={text} fontSize="12" fontWeight="700">{fmt(v)}</text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fill={muted} fontSize="11">{labs[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
