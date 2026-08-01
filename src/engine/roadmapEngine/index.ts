import { industryRuleFor } from "@/engine/industryRules";
import type { Recommendation } from "@/engine/recommendationEngine";
import type { BusinessProfile, Difficulty, HorizonId, Impact } from "@/engine/types";

/**
 * The roadmap engine.
 *
 * Turns a ranked list of engagements into a sequence a business can actually
 * follow, across six horizons. Two things decide placement beyond urgency:
 * prerequisites (measurement before optimisation, a record before automating
 * it), and capacity — a small team cannot run four workstreams at once.
 */

export interface Horizon {
  id: HorizonId;
  label: string;
  /** What this phase is for, in one line. */
  objective: string;
}

export const HORIZONS: readonly Horizon[] = [
  {
    id: "immediate",
    label: "Immediate wins",
    objective:
      "Stop the losses already happening. Fast, cheap, and self-funding — start these this week.",
  },
  {
    id: "30-days",
    label: "First 30 days",
    objective: "Put the missing foundations in place so later work has something to build on.",
  },
  {
    id: "60-days",
    label: "Days 31–60",
    objective: "Turn the repaired foundations into repeatable demand and conversion.",
  },
  {
    id: "90-days",
    label: "Days 61–90",
    objective: "Automate the manual load and instrument what is working.",
  },
  {
    id: "6-months",
    label: "Months 4–6",
    objective: "Extend into the harder, higher-ceiling work the first quarter made possible.",
  },
  {
    id: "12-months",
    label: "Months 7–12",
    objective: "Compound the gains and remove the remaining structural constraints.",
  },
] as const;

const HORIZON_ORDER: HorizonId[] = HORIZONS.map((horizon) => horizon.id);

/**
 * Work that must not be scheduled before the thing it depends on.
 * Declared here rather than on the service, because it is a property of the
 * sequence, not of the engagement.
 */
const PREREQUISITES: Record<string, string[]> = {
  "executive-dashboard": ["analytics-tracking"],
  "crm-optimisation": ["crm-implementation"],
  "lifecycle-messaging": ["crm-implementation"],
  "retention-programme": ["crm-implementation"],
  "content-engine": ["seo-foundation"],
  "landing-pages": ["website-build"],
  "web-performance": ["website-build"],
  "direct-ordering": ["menu-management"],
  "patient-recall": ["practice-management"],
  "dealer-portal": ["product-catalogue"],
  "rfq-automation": ["product-catalogue"],
  "ai-enablement": ["workflow-automation"],
};

export interface RoadmapTask {
  serviceId: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  impact: Impact;
  effortDays: number;
  costMin: number;
  costMax: number;
  roi: string;
  priority: Recommendation["priority"];
  /** Why this sits in this phase rather than another. */
  sequencingNote: string;
  stretch: boolean;
}

export interface RoadmapPhase {
  id: HorizonId;
  label: string;
  objective: string;
  tasks: RoadmapTask[];
  effortDays: number;
  investmentMin: number;
  investmentMax: number;
}

export interface RoadmapInput {
  profile: BusinessProfile;
  recommendations: Recommendation[];
}

/** How many engagements a business of this size can run at once. */
function concurrencyFor(profile: BusinessProfile): number {
  if (profile.teamSize === "solo") return 1;
  if (profile.teamSize === "2-10") return 2;
  if (profile.teamSize === "11-50") return 3;
  return 4;
}

/**
 * Rank order, rearranged so a prerequisite is always placed before the work
 * that depends on it.
 *
 * Placement is a single forward pass — it only ever pushes a task later — so a
 * dependent that came up first would find its prerequisite unplaced and lose
 * the constraint entirely. Rank order is otherwise preserved.
 */
function inDependencyOrder(recommendations: Recommendation[]): Recommendation[] {
  const byId = new Map(recommendations.map((entry) => [entry.service.id, entry]));
  const ordered: Recommendation[] = [];
  const placed = new Set<string>();
  const onPath = new Set<string>();

  const visit = (recommendation: Recommendation): void => {
    const id = recommendation.service.id;
    if (placed.has(id) || onPath.has(id)) return; // A cycle keeps rank order.
    onPath.add(id);
    for (const prerequisiteId of PREREQUISITES[id] ?? []) {
      const prerequisite = byId.get(prerequisiteId);
      if (prerequisite) visit(prerequisite);
    }
    onPath.delete(id);
    placed.add(id);
    ordered.push(recommendation);
  };

  recommendations.forEach(visit);
  return ordered;
}

export function buildRoadmap({ profile, recommendations }: RoadmapInput): RoadmapPhase[] {
  const rule = industryRuleFor(profile.industry);
  const concurrency = concurrencyFor(profile);
  const lastHorizon = HORIZON_ORDER.length - 1;

  const placement = new Map<string, number>();
  const notes = new Map<string, string>();
  const load = new Map<number, number>();

  // Work that something else in this plan waits on.
  const blocking = new Set<string>();
  for (const recommendation of recommendations) {
    for (const prerequisiteId of PREREQUISITES[recommendation.service.id] ?? []) {
      if (recommendations.some((entry) => entry.service.id === prerequisiteId)) {
        blocking.add(prerequisiteId);
      }
    }
  }

  // Recommendations arrive already ranked, so the highest-value work claims the
  // earliest slot its constraints allow.
  for (const recommendation of inDependencyOrder(recommendations)) {
    const service = recommendation.service;
    // Anything with a dependant must leave it a later phase to sit in,
    // otherwise both land in the final horizon and the order is meaningless.
    const ceiling = blocking.has(service.id) ? lastHorizon - 1 : lastHorizon;
    let index = HORIZON_ORDER.indexOf(service.defaultHorizon);
    let note = "Scheduled at its natural point in the sequence.";

    if (recommendation.priority === "HIGH" && service.difficulty === "easy" && index > 0) {
      index = 0;
      note = "Pulled forward: high urgency, low effort, and it funds the work that follows.";
    } else if (recommendation.industryPriority && index > 1) {
      index -= 1;
      note = `Brought forward — ${rule.label.toLowerCase()} businesses usually need this early.`;
    }

    if (recommendation.stretch) {
      index = Math.min(index + 2, ceiling);
      note =
        "Deferred: a significant investment relative to current revenue. Better funded by the returns from the earlier phases.";
    }

    if (recommendation.priority === "LOW" && index < 3) {
      index = 3;
      note = "Worth doing, but not before the higher-urgency work has landed.";
    }

    // Never before a prerequisite that is also in the plan.
    for (const prerequisiteId of PREREQUISITES[service.id] ?? []) {
      const prerequisiteIndex = placement.get(prerequisiteId);
      if (prerequisiteIndex !== undefined && index <= prerequisiteIndex) {
        index = Math.min(prerequisiteIndex + 1, ceiling);
        note = `Sequenced after ${prerequisiteId.replace(/-/g, " ")}, which it depends on.`;
      }
    }

    // Respect what the team can actually run in parallel.
    while ((load.get(index) ?? 0) >= concurrency && index < ceiling) {
      index += 1;
      note = "Moved out a phase — the earlier phases are already at the capacity of your team.";
    }

    placement.set(service.id, index);
    notes.set(service.id, note);
    load.set(index, (load.get(index) ?? 0) + 1);
  }

  return HORIZONS.map((horizon, index) => {
    const tasks: RoadmapTask[] = recommendations
      .filter((recommendation) => placement.get(recommendation.service.id) === index)
      .map((recommendation) => ({
        serviceId: recommendation.service.id,
        title: recommendation.service.name,
        summary: recommendation.service.summary,
        difficulty: recommendation.service.difficulty,
        impact: recommendation.service.impact,
        effortDays: recommendation.service.effortDays,
        costMin: recommendation.service.costMin,
        costMax: recommendation.service.costMax,
        roi: recommendation.service.roi,
        priority: recommendation.priority,
        sequencingNote: notes.get(recommendation.service.id) ?? "",
        stretch: recommendation.stretch,
      }));

    return {
      id: horizon.id,
      label: horizon.label,
      objective: horizon.objective,
      tasks,
      effortDays: tasks.reduce((sum, task) => sum + task.effortDays, 0),
      investmentMin: tasks.reduce((sum, task) => sum + task.costMin, 0),
      investmentMax: tasks.reduce((sum, task) => sum + task.costMax, 0),
    };
  });
}

/** Phases with work in them — what the report and proposal actually display. */
export function activePhases(roadmap: RoadmapPhase[]): RoadmapPhase[] {
  return roadmap.filter((phase) => phase.tasks.length > 0);
}
