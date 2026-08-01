import type { DomainId, HorizonId, IndustryId } from "@/engine/types";

/**
 * What an industry changes about the assessment.
 *
 * A rule never contains code — it is a declaration of emphasis. That keeps
 * every industry comparable, makes the differences auditable side by side,
 * and means adding one is a data change rather than a code change.
 */
export interface IndustryRule {
  id: IndustryId;
  label: string;
  /**
   * Multipliers applied to each domain's base weight when scoring this
   * industry. 1 leaves the default; 1.3 says this domain matters more here.
   */
  domainEmphasis: Partial<Record<DomainId, number>>;
  /**
   * Services that lead the recommendation list for this industry when the
   * answers trigger them. Order is the industry's own priority order.
   */
  priorityServices: string[];
  /** Capabilities this sector is assessed on that others are not. */
  injectedTopics: string[];
  /** One sentence naming what actually drives revenue in this sector. */
  narrative: string;
  /** Where this sector usually has to start, absent other signals. */
  defaultFirstMove: HorizonId;
}
