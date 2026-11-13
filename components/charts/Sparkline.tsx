/** A small trend line with its target as a dashed rule. Decorative: the tile states the numbers. */
export function Sparkline({ values, target }: { values: number[]; target: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values, target);
  const hi = Math.max(...values, target);
  const span = hi - lo || 1;
  const x = (i: number) => (i / (values.length - 1)) * 100;
  const y = (v: number) => 26 - ((v - lo) / span) * 22;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className="h-8 w-full overflow-visible">
      <line x1="0" x2="100" y1={y(target)} y2={y(target)} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="stroke-mu2" />
      <polyline points={points} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="stroke-brand" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="2" vectorEffect="non-scaling-stroke" className="fill-brand" />
    </svg>
  );
}
