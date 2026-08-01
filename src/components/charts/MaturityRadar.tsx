"use client";

import { useState } from "react";
import type { DomainScore } from "@/engine/scoreEngine";

/**
 * Radar of the capability scores.
 *
 * A single series, so there is no legend — the figure's caption names what is
 * plotted. Identity for each axis is carried by its label, never by colour;
 * the accent is decoration on one shape. The domain table beside the chart on
 * the report page is the non-visual equivalent of this figure.
 *
 * Domains that were not assessed are plotted at zero and greyed in the axis
 * labels, so an absent score never reads as a bad one.
 */

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 112;
const RINGS = [25, 50, 75, 100];

export function MaturityRadar({ domains }: { domains: DomainScore[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (domains.length < 3) return null;

  const step = (Math.PI * 2) / domains.length;
  const point = (index: number, value: number) => {
    const angle = index * step - Math.PI / 2;
    const distance = (Math.min(Math.max(value, 0), 100) / 100) * RADIUS;
    return {
      x: CENTER + Math.cos(angle) * distance,
      y: CENTER + Math.sin(angle) * distance,
    };
  };

  const polygon = domains
    .map((domain, index) => {
      const { x, y } = point(index, domain.score);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const activeDomain = active === null ? null : domains[active];

  return (
    <figure className="relative m-0 w-full">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[360px] overflow-visible"
        role="img"
        aria-label={`Capability scores: ${domains
          .map((d) =>
            d.notAssessed ? `${d.name} not assessed` : `${d.name} ${Math.round(d.score)} out of 100`
          )
          .join(", ")}`}
      >
        {/* Recessive scaffolding: hairline, solid, one step off the surface. */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={domains
              .map((_, index) => {
                const { x, y } = point(index, ring);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {domains.map((domain, index) => {
          const { x, y } = point(index, 100);
          return (
            <line
              key={`spoke-${domain.domainId}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygon}
          fill="var(--accent)"
          fillOpacity={0.14}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {domains.map((domain, index) => {
          const { x, y } = point(index, domain.score);
          const isActive = active === index;
          return (
            <g key={`vertex-${domain.domainId}`}>
              {/* Surface ring keeps the marker legible where it meets the shape. */}
              <circle cx={x} cy={y} r={isActive ? 7 : 5} fill="var(--surface)" />
              <circle
                cx={x}
                cy={y}
                r={isActive ? 5 : 3.5}
                fill={domain.notAssessed ? "var(--border-strong)" : "var(--accent)"}
              />
              {/* Hit target is deliberately larger than the mark. */}
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={
                  domain.notAssessed
                    ? `${domain.name}: not assessed`
                    : `${domain.name}: ${Math.round(domain.score)} out of 100`
                }
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none"
              />
            </g>
          );
        })}

        {domains.map((domain, index) => {
          const angle = index * step - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * (RADIUS + 28);
          const y = CENTER + Math.sin(angle) * (RADIUS + 22);
          const cos = Math.cos(angle);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          return (
            <text
              key={`label-${domain.domainId}`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill={
                active === index
                  ? "var(--ink)"
                  : domain.notAssessed
                    ? "var(--border-strong)"
                    : "var(--ink-muted)"
              }
            >
              {domain.shortName}
            </text>
          );
        })}
      </svg>

      <div aria-live="polite" className="mt-3 min-h-[2.75rem] text-center">
        {activeDomain ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-hairline-strong bg-surface-raised px-3 py-2 text-[13px]">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: activeDomain.colorVar }}
            />
            <span className="text-ink">{activeDomain.name}</span>
            {activeDomain.notAssessed ? (
              <span className="text-ink-muted">not assessed</span>
            ) : (
              <>
                <span className="tabular font-semibold text-ink">
                  {Math.round(activeDomain.score)}
                </span>
                <span className="text-ink-muted">/ 100 · {activeDomain.bandLabel}</span>
              </>
            )}
          </span>
        ) : (
          <figcaption className="text-[13px] text-ink-muted">
            Score out of 100 per capability. Hover or focus a point for detail.
          </figcaption>
        )}
      </div>
    </figure>
  );
}
