import type { Domain, DomainId } from "@/engine/types";

/**
 * The nine capability areas. `baseWeight` is the starting contribution to
 * overall maturity; industry rules and the client's stated priorities adjust
 * it per assessment, so no two businesses are scored on the same scale.
 */
export const DOMAINS: readonly Domain[] = [
  {
    id: "website",
    name: "Website & Digital Presence",
    shortName: "Website",
    description:
      "Whether your digital front door earns trust and turns visitors into conversations.",
    baseWeight: 1.2,
  },
  {
    id: "seo",
    name: "Search & Discoverability",
    shortName: "SEO",
    description: "Whether buyers can find you at the moment they are actively looking.",
    baseWeight: 1.1,
  },
  {
    id: "brand",
    name: "Brand & Positioning",
    shortName: "Brand",
    description:
      "How clearly you are understood, remembered, and chosen over a cheaper alternative.",
    baseWeight: 1,
  },
  {
    id: "marketing",
    name: "Marketing & Demand",
    shortName: "Marketing",
    description: "How reliably you create demand rather than waiting for it to arrive.",
    baseWeight: 1.1,
  },
  {
    id: "sales",
    name: "Sales & Conversion",
    shortName: "Sales",
    description: "How much of the interest you generate actually converts into revenue.",
    baseWeight: 1.25,
  },
  {
    id: "crm",
    name: "CRM & Customer Data",
    shortName: "CRM",
    description: "Whether you own a reliable record of every customer and every deal.",
    baseWeight: 1.05,
  },
  {
    id: "automation",
    name: "Automation & AI",
    shortName: "Automation",
    description: "How much of your operating load is carried by systems instead of people.",
    baseWeight: 0.9,
  },
  {
    id: "analytics",
    name: "Analytics & Reporting",
    shortName: "Analytics",
    description: "Whether you can see what is happening and repeat what works.",
    baseWeight: 1,
  },
  {
    id: "customerExperience",
    name: "Customer Experience",
    shortName: "Experience",
    description:
      "What happens after the sale — the part that decides whether growth compounds.",
    baseWeight: 1,
  },
] as const;

const BY_ID = new Map(DOMAINS.map((domain) => [domain.id, domain]));

export function getDomain(id: DomainId): Domain {
  const domain = BY_ID.get(id);
  if (!domain) throw new Error(`Unknown domain: ${id}`);
  return domain;
}
