import React, { useId, useMemo, useState } from 'react';

const VIEW_WIDTH = 600;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 3) return `M${pts.map((p) => `${p[0]},${p[1]}`).join('L')}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

interface TrendPoint {
  t: number;
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[];
  color?: string;
  height?: number;
  formatLabel?: (t: number) => string;
  formatValue?: (val: number) => string;
  valueName?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  points,
  color = 'var(--deck-cyan)',
  height = 200,
  formatLabel,
  formatValue,
  valueName = '',
}) => {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { pts, line, area, labels } = useMemo(() => {
    if (!points || points.length === 0) {
      return { pts: [], line: '', area: '', labels: [] };
    }
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.max(1, Math.abs(max) * 0.1);
    const yTop = max + span * 0.08;
    const yBottom = min - span * 0.08;
    const plotHeight = height - PAD_TOP - PAD_BOTTOM;
    const plotWidth = VIEW_WIDTH - PAD_X * 2;

    const computed: [number, number][] = points.map((p, i) => [
      +(PAD_X + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth)).toFixed(1),
      +(PAD_TOP + (1 - (p.value - yBottom) / (yTop - yBottom)) * plotHeight).toFixed(1),
    ]);

    const linePath = smoothPath(computed);
    const areaPath = `${linePath}L${computed[computed.length - 1][0]},${height - PAD_BOTTOM}L${computed[0][0]},${height - PAD_BOTTOM}Z`;

    const labelCount = Math.min(5, points.length);
    const axisLabels: { x: number; text: string; anchor: 'start' | 'middle' | 'end' }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const index = Math.round((i / Math.max(1, labelCount - 1)) * (points.length - 1));
      const text = formatLabel ? formatLabel(points[index].t) : '';
      if (axisLabels.length > 0 && axisLabels[axisLabels.length - 1].text === text) continue;
      axisLabels.push({
        x: computed[index][0],
        text,
        anchor: i === 0 ? 'start' : i === labelCount - 1 ? 'end' : 'middle',
      });
    }

    return { pts: computed, line: linePath, area: areaPath, labels: axisLabels };
  }, [points, height, formatLabel]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!points || points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (points.length - 1)));
  };

  const hover = hoverIndex !== null && points[hoverIndex] ? { point: points[hoverIndex], pos: pts[hoverIndex] } : null;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.28, 0.55, 0.82].map((fraction) => (
          <line
            key={fraction}
            x1={PAD_X}
            x2={VIEW_WIDTH - PAD_X}
            y1={PAD_TOP + fraction * (height - PAD_TOP - PAD_BOTTOM)}
            y2={PAD_TOP + fraction * (height - PAD_TOP - PAD_BOTTOM)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 4"
          />
        ))}
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" />}
        {hover && hover.pos && (
          <>
            <line x1={hover.pos[0]} x2={hover.pos[0]} y1={PAD_TOP} y2={height - PAD_BOTTOM} stroke="rgba(255,255,255,0.2)" />
            <circle cx={hover.pos[0]} cy={hover.pos[1]} r="4" fill={color} stroke="#080A10" strokeWidth="2" />
          </>
        )}
        {labels.map((label) => (
          <text key={label.x} x={label.x} y={height - 8} textAnchor={label.anchor} fill="#64748B" fontSize="10" fontFamily="var(--font-mono)">
            {label.text}
          </text>
        ))}
      </svg>
      {hover && hover.pos && (
        <div
          style={{
            position: 'absolute',
            left: `${(hover.pos[0] / VIEW_WIDTH) * 100}%`,
            top: `${(hover.pos[1] / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#0E121B',
            border: '1px solid var(--deck-border)',
            borderRadius: 6,
            padding: '4px 8px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <div style={{ color: 'var(--deck-cyan)', fontWeight: 700 }}>
            {formatValue ? formatValue(hover.point.value) : hover.point.value.toLocaleString()} {valueName}
          </div>
        </div>
      )}
    </div>
  );
};
