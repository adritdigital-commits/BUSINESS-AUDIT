"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlowShell, FlowSkeleton, StepHeading } from "@/components/audit/FlowShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import {
  INDUSTRIES,
  PRIMARY_GOALS,
  REVENUE_BANDS,
  TEAM_SIZES,
} from "@/data/formOptions";
import { TOTAL_QUESTIONS } from "@/data/questionBank";
import { useAudit } from "@/lib/audit/AuditProvider";
import type { BusinessDetails } from "@/lib/audit/types";
import {
  hasErrors,
  validateBusiness,
  validateClient,
  type FieldErrors,
} from "@/lib/audit/validation";

export default function BusinessDetailsPage() {
  const router = useRouter();
  const { ready, state, setBusiness } = useAudit();
  const [errors, setErrors] = useState<FieldErrors<BusinessDetails>>({});
  const [submitted, setSubmitted] = useState(false);

  // Reaching step 2 without completing step 1 leaves the report unaddressable,
  // so send them back rather than letting the gap surface at the end.
  const clientIncomplete = ready && hasErrors(validateClient(state.client));
  useEffect(() => {
    if (clientIncomplete) router.replace("/audit/client");
  }, [clientIncomplete, router]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateBusiness(state.business);
    setErrors(nextErrors);
    setSubmitted(true);
    if (hasErrors(nextErrors)) return;
    router.push("/audit/questions");
  }

  function update(patch: Partial<BusinessDetails>) {
    setBusiness(patch);
    if (submitted) setErrors(validateBusiness({ ...state.business, ...patch }));
  }

  if (!ready || clientIncomplete) {
    return (
      <FlowShell>
        <FlowSkeleton />
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <StepHeading
        step="Step 2 of 3"
        title="Now, the business we are assessing"
        description="This frames the report — industry and size change which gaps matter most, and your primary goal decides what leads the roadmap."
      />

      <Card>
        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Business name"
              value={state.business.businessName}
              onChange={(value) => update({ businessName: value })}
              error={errors.businessName}
              placeholder="Northline Interiors"
              autoComplete="organization"
            />
            <TextField
              label="Website"
              type="url"
              inputMode="url"
              optional
              value={state.business.website}
              onChange={(value) => update({ website: value })}
              error={errors.website}
              placeholder="northline.co.in"
              hint="Leave blank if you do not have one yet."
            />
            <SelectField
              label="Industry"
              value={state.business.industry}
              onChange={(value) => update({ industry: value })}
              options={INDUSTRIES}
              error={errors.industry}
            />
            <SelectField
              label="Team size"
              value={state.business.teamSize}
              onChange={(value) => update({ teamSize: value })}
              options={TEAM_SIZES}
              error={errors.teamSize}
            />
            <SelectField
              label="Annual revenue"
              value={state.business.annualRevenue}
              onChange={(value) => update({ annualRevenue: value })}
              options={REVENUE_BANDS}
              error={errors.annualRevenue}
            />
            <SelectField
              label="Primary goal right now"
              value={state.business.primaryGoal}
              onChange={(value) => update({ primaryGoal: value })}
              options={PRIMARY_GOALS}
              error={errors.primaryGoal}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
            <ButtonLink href="/audit/client" variant="ghost" size="md">
              Back
            </ButtonLink>
            <Button type="submit" size="md">
              Start the {TOTAL_QUESTIONS} questions
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
                <path
                  d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </form>
      </Card>
    </FlowShell>
  );
}
