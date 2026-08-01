"use client";

import { useState } from "react";
import type { CategoryScore } from "@/lib/audit/scoring";

/**
 * Seven-axis radar of the category scores.
 *
 * A single series, so there is no legend — the figure's caption names what is
 * plotted. Identity for each axis is carried by its label, never by colour;
 * the accent is decoration on one shape. The category table beneath the chart
 * on the report page is the non-visual equivalent of this figure.
 */

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 110;
const RINGS = [25, 50, 75, 100];

export function MaturityRadar({ categories }: { categories: CategoryScore[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (categories.length < 3) return null;

  const step = (Math.PI * 2) / categories.length;
  const point = (index: number, value: number) => {
    const angle = index * step - Math.PI / 2;
    const distance = (Math.min(Math.max(value, 0), 100) / 100) * RADIUS;
    return {
      x: CENTER + Math.cos(angle) * distance,
      y: CENTER + Math.sin(angle) * distance,
    };
  };

  const polygon = categories
    .map((category, index) => {
      const { x, y } = point(index, category.score);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const activeCategory = active === null ? null : categories[active];

  return (
    <figure className="relative m-0 w-full">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[340px] overflow-visible"
        role="img"
        aria-label={`Category scores: ${categories
          .map((c) => `${c.name} ${Math.round(c.score)} out of 100`)
          .join(", ")}`}
      >
        {/* Recessive scaffolding: hairline, solid, one step off the surface. */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={categories
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
        {categories.map((category, index) => {
          const { x, y } = point(index, 100);
          return (
            <line
              key={`spoke-${category.categoryId}`}
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

        {categories.map((category, index) => {
          const { x, y } = point(index, category.score);
          const isActive = active === index;
          return (
            <g key={`vertex-${category.categoryId}`}>
              {/* Surface ring keeps the marker legible where it meets the shape. */}
              <circle cx={x} cy={y} r={isActive ? 7 : 5} fill="var(--surface)" />
              <circle
                cx={x}
                cy={y}
                r={isActive ? 5 : 3.5}
                fill="var(--accent)"
              />
              {/* Hit target is deliberately larger than the mark. */}
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${category.name}: ${Math.round(category.score)} out of 100`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none"
              />
            </g>
          );
        })}

        {categories.map((category, index) => {
          const angle = index * step - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * (RADIUS + 26);
          const y = CENTER + Math.sin(angle) * (RADIUS + 22);
          const cos = Math.cos(angle);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          return (
            <text
              key={`label-${category.categoryId}`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill={active === index ? "var(--ink)" : "var(--ink-muted)"}
            >
              {category.shortName}
            </text>
          );
        })}
      </svg>

      <div aria-live="polite" className="mt-3 min-h-[2.75rem] text-center">
        {activeCategory ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-hairline-strong bg-surface-raised px-3 py-2 text-[13px]">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: activeCategory.colorVar }}
            />
            <span className="text-ink">{activeCategory.name}</span>
            <span className="tabular font-semibold text-ink">
              {Math.round(activeCategory.score)}
            </span>
            <span className="text-ink-muted">/ 100 · {activeCategory.bandLabel}</span>
          </span>
        ) : (
          <figcaption className="text-[13px] text-ink-muted">
            Score out of 100 per category. Hover or focus a point for detail.
          </figcaption>
        )}
      </div>
    </figure>
  );
}
