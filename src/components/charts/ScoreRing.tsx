import { bandFor } from "@/engine/scoreEngine";

/**
 * The single hero figure the report leads with. Pure SVG computed from props,
 * so the server and client renders are byte-identical.
 *
 * The track is a recessive step of the same geometry rather than a second
 * colour, so severity is the only thing colour is doing here.
 */
export function ScoreRing({
  score,
  size = 208,
  label = "Digital maturity",
  caption,
}: {
  score: number;
  size?: number;
  label?: string;
  caption?: string;
}) {
  const stroke = Math.round(size * 0.055);
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;
  const meta = bandFor(clamped);
  const center = size / 2;

  return (
    <figure className="m-0 flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label} score: ${Math.round(clamped)} out of 100 — ${meta.label}`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--surface-raised)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={meta.colorVar}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.3,1)" }}
        />
        <text
          x="50%"
          y="49%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--ink)"
          fontSize={size * 0.3}
          fontWeight={600}
          letterSpacing="-0.03em"
        >
          {Math.round(clamped)}
        </text>
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize={size * 0.062}
          letterSpacing="0.16em"
        >
          OUT OF 100
        </text>
      </svg>
      <figcaption className="mt-4 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium"
          style={{
            color: meta.colorVar,
            borderColor: "color-mix(in srgb, currentColor 40%, transparent)",
            backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)",
          }}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {meta.label}
        </span>
        {caption ? <p className="mt-2 text-[13px] text-ink-muted">{caption}</p> : null}
      </figcaption>
    </figure>
  );
}
