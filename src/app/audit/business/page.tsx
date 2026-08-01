"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FlowShell, FlowSkeleton, StepHeading } from "@/components/audit/FlowShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipCheckboxGroup, ChipRadioGroup } from "@/components/ui/ChoiceGroup";
import { ChoiceSelectField, TextField } from "@/components/ui/Field";
import {
  ACQUISITION_CHANNELS,
  BUSINESS_AGES,
  BUSINESS_TYPES,
  INDUSTRIES,
  PRIORITY_GOALS,
  PRIORITY_PICK_COUNT,
  REVENUE_BANDS,
  TEAM_SIZES,
} from "@/engine/businessProfile";
import { industryRuleFor } from "@/engine/industryRules";
import { planAssessment } from "@/engine/questionEngine";
import type { BusinessProfile } from "@/engine/types";
import { useAudit } from "@/lib/audit/AuditProvider";
import {
  hasErrors,
  validateContact,
  validateProfile,
  type FieldErrors,
} from "@/lib/audit/validation";

const toOptions = <T extends string>(list: ReadonlyArray<{ id: T; label: string }>) => list;

export default function BusinessProfilePage() {
  const router = useRouter();
  const { ready, state, setProfile, toggleChannel, togglePriority, profileComplete } = useAudit();
  const [errors, setErrors] = useState<FieldErrors<BusinessProfile>>({});
  const [submitted, setSubmitted] = useState(false);

  // Reaching step 2 without completing step 1 leaves the report unaddressable.
  const contactIncomplete = ready && hasErrors(validateContact(state.contact));
  useEffect(() => {
    if (contactIncomplete) router.replace("/audit/client");
  }, [contactIncomplete, router]);

  // A live preview of what the profile has already changed about the
  // assessment. It is the clearest possible demonstration that these answers
  // are doing work rather than being filed away.
  const preview = useMemo(() => {
    if (!profileComplete) return null;
    const plan = planAssessment(state.profile, {});
    const rule = industryRuleFor(state.profile.industry);
    return { count: plan.baseCount, topics: rule.injectedTopics, narrative: rule.narrative };
  }, [profileComplete, state.profile]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateProfile(state.profile);
    setErrors(nextErrors);
    setSubmitted(true);
    if (hasErrors(nextErrors)) return;
    router.push("/audit/questions");
  }

  function update(patch: Partial<BusinessProfile>) {
    setProfile(patch);
    if (submitted) setErrors(validateProfile({ ...state.profile, ...patch }));
  }

  if (!ready || contactIncomplete) {
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
        description="This is what makes the assessment yours. Industry, size, stage and priorities decide which questions you are asked and how each answer is weighted."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* ------------------------------------------------------ identity */}
        <Card className="p-5 sm:p-7">
          <SectionLabel index="01" title="The basics" />
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <TextField
              label="Business name"
              value={state.profile.businessName}
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
              value={state.profile.website}
              onChange={(value) => update({ website: value })}
              error={errors.website}
              placeholder="northline.co.in"
              hint="Leave blank if you do not have one — we will assess you differently."
            />
            <ChoiceSelectField
              label="Industry"
              value={state.profile.industry}
              onChange={(value) => update({ industry: value })}
              options={INDUSTRIES}
              error={errors.industry}
            />
            <ChoiceSelectField
              label="Annual revenue"
              value={state.profile.annualRevenue}
              onChange={(value) => update({ annualRevenue: value })}
              options={REVENUE_BANDS}
              error={errors.annualRevenue}
            />
          </div>
        </Card>

        {/* --------------------------------------------------- shape & stage */}
        <Card className="p-5 sm:p-7">
          <SectionLabel index="02" title="Shape and stage" />
          <div className="mt-5 flex flex-col gap-7">
            <ChipRadioGroup
              label="Business type"
              options={toOptions(BUSINESS_TYPES)}
              value={state.profile.businessType}
              onChange={(value) => update({ businessType: value })}
              error={errors.businessType}
            />
            <ChipRadioGroup
              label="How long have you been trading?"
              options={toOptions(BUSINESS_AGES)}
              value={state.profile.businessAge}
              onChange={(value) => update({ businessAge: value })}
              error={errors.businessAge}
            />
            <ChipRadioGroup
              label="Team size"
              options={toOptions(TEAM_SIZES)}
              value={state.profile.teamSize}
              onChange={(value) => update({ teamSize: value })}
              error={errors.teamSize}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------- channels */}
        <Card className="p-5 sm:p-7">
          <SectionLabel index="03" title="Where customers come from" />
          <div className="mt-5">
            <ChipCheckboxGroup
              label="Select every channel that brings you customers today"
              hint="Select all that apply"
              options={toOptions(ACQUISITION_CHANNELS)}
              values={state.profile.acquisitionChannels}
              onToggle={toggleChannel}
              error={errors.acquisitionChannels}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------ priorities */}
        <Card className="p-5 sm:p-7">
          <SectionLabel index="04" title="What you want to fix" />
          <div className="mt-5 flex flex-col gap-7">
            <ChipCheckboxGroup
              label={`Choose the ${PRIORITY_PICK_COUNT} areas that matter most right now`}
              hint={`Pick exactly ${PRIORITY_PICK_COUNT}`}
              options={toOptions(PRIORITY_GOALS)}
              values={state.profile.priorities}
              onToggle={togglePriority}
              error={errors.priorities}
              max={PRIORITY_PICK_COUNT}
            />
            <ChipRadioGroup
              label="Of those, which is the single biggest priority?"
              hint="Weighted twice as heavily as the others"
              options={toOptions(
                PRIORITY_GOALS.filter((goal) => state.profile.priorities.includes(goal.id))
              )}
              value={state.profile.primaryGoal}
              onChange={(value) => update({ primaryGoal: value })}
              error={errors.primaryGoal}
            />
            {state.profile.priorities.length === 0 ? (
              <p className="-mt-4 text-[13px] text-ink-muted">
                Select your priorities above and they will appear here.
              </p>
            ) : null}
          </div>
        </Card>

        {/* --------------------------------------------------- live preview */}
        {preview ? (
          <Card className="border-accent/25 bg-accent/[0.05] p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Your assessment is ready</Badge>
              <Badge>{preview.count} questions selected</Badge>
            </div>
            <p className="mt-4 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
              {preview.narrative}
            </p>
            <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-ink-muted">
              Assessed for your sector
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {preview.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-hairline-strong px-3 py-1.5 text-[12.5px] text-ink-secondary"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <ButtonLink href="/audit/client" variant="ghost" size="md">
            Back
          </ButtonLink>
          <Button type="submit" size="md">
            Build my assessment
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
    </FlowShell>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="tabular text-[12px] font-medium text-accent">{index}</span>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
    </div>
  );
}
