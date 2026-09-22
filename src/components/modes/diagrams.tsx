"use client";

export interface DiagramNode { label: string; detail?: string }
export interface DiagramEdge { from: number; to: number; label?: string }

/** Deterministic SVG diagrams. AI owns semantic nodes/edges; geometry lives here. */

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function SlideDiagram({
  nodes,
  edges,
  direction,
  accent,
  text,
  muted,
  cardBg,
  cardBorder,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction: string;
  accent: string;
  text: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
}) {
  const safe = nodes.length > 0 ? nodes.slice(0, 8) : [{ label: "Start" }];
  if (direction === "hub") return <HubDiagram nodes={safe} accent={accent} text={text} muted={muted} cardBg={cardBg} cardBorder={cardBorder} />;
  if (direction === "vertical") return <VerticalDiagram nodes={safe} edges={edges} accent={accent} text={text} muted={muted} cardBg={cardBg} cardBorder={cardBorder} />;
  return <FlowDiagram nodes={safe} edges={edges} accent={accent} text={text} muted={muted} cardBg={cardBg} cardBorder={cardBorder} />;
}

function NodeBox({ x, y, w, h, label, detail, accent, text, muted, cardBg, cardBorder }: {
  x: number; y: number; w: number; h: number; label: string; detail?: string;
  accent: string; text: string; muted: string; cardBg: string; cardBorder: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill={cardBg} stroke={cardBorder} strokeWidth="1.5" />
      <rect x={x} y={y} width={4} height={h} rx="2" fill={accent} />
      <text x={x + 16} y={y + (detail ? 26 : h / 2 + 5)} fill={text} fontSize="14" fontWeight="700">{trunc(label || "Step", 22)}</text>
      {detail ? <text x={x + 16} y={y + 44} fill={muted} fontSize="11">{trunc(detail, 30)}</text> : null}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, accent, muted }: {
  x1: number; y1: number; x2: number; y2: number; label?: string; accent: string; muted: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="2.5" />
      <polygon
        points={y1 === y2 ? `${x2 - 9},${y2 - 5} ${x2 - 9},${y2 + 5} ${x2},${y2}` : `${x2 - 5},${y2 - 9} ${x2 + 5},${y2 - 9} ${x2},${y2}`}
        fill={accent}
      />
      {label ? <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} textAnchor="middle" fill={muted} fontSize="10">{trunc(label, 18)}</text> : null}
    </g>
  );
}

function edgeLabel(edges: DiagramEdge[], a: number, b: number): string | undefined {
  return edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))?.label;
}

function FlowDiagram(props: { nodes: DiagramNode[]; edges: DiagramEdge[]; accent: string; text: string; muted: string; cardBg: string; cardBorder: string }) {
  const { nodes, edges } = props;
  const n = nodes.length;
  const W = 640, NW = 150, NH = 64, GAP = 44;
  const totalW = n * NW + (n - 1) * GAP;
  const x0 = Math.max(8, (W - totalW) / 2);
  const y = 60;
  return (
    <svg viewBox={`0 0 ${W} 190`} className="w-full">
      {nodes.map((node, i) => {
        const x = x0 + i * (NW + GAP);
        return (
          <g key={i}>
            <NodeBox x={x} y={y} w={NW} h={NH} label={node.label} detail={node.detail} {...props} />
            {i < n - 1 ? <Arrow x1={x + NW} y1={y + NH / 2} x2={x + NW + GAP} y2={y + NH / 2} label={edgeLabel(edges, i, i + 1)} accent={props.accent} muted={props.muted} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function VerticalDiagram(props: { nodes: DiagramNode[]; edges: DiagramEdge[]; accent: string; text: string; muted: string; cardBg: string; cardBorder: string }) {
  const { nodes, edges } = props;
  const W = 640, NW = 300, NH = 58, GAP = 34;
  const x = (W - NW) / 2;
  const H = nodes.length * NH + (nodes.length - 1) * GAP + 24;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 380 }}>
      {nodes.map((node, i) => {
        const y = 12 + i * (NH + GAP);
        return (
          <g key={i}>
            <NodeBox x={x} y={y} w={NW} h={NH} label={node.label} detail={node.detail} {...props} />
            {i < nodes.length - 1 ? <Arrow x1={W / 2} y1={y + NH} x2={W / 2} y2={y + NH + GAP} label={edgeLabel(edges, i, i + 1)} accent={props.accent} muted={props.muted} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function HubDiagram(props: { nodes: DiagramNode[]; accent: string; text: string; muted: string; cardBg: string; cardBorder: string }) {
  const { nodes } = props;
  const cx = 320, cy = 110, R = 120;
  const sats = nodes.slice(1, 7);
  return (
    <svg viewBox="0 0 640 240" className="w-full">
      {sats.map((s, i) => {
        const a = (i / sats.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a) * 0.72;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={props.accent} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 4" />
            <rect x={x - 62} y={y - 20} width={124} height={40} rx="10" fill={props.cardBg} stroke={props.cardBorder} />
            <text x={x} y={y + 5} textAnchor="middle" fill={props.text} fontSize="12" fontWeight="700">{trunc(s.label || "Node", 16)}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={44} fill={props.accent} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">{trunc(nodes[0]?.label || "Core", 12)}</text>
    </svg>
  );
}
