"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlowShell, FlowSkeleton, StepHeading } from "@/components/audit/FlowShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { ROLES } from "@/data/formOptions";
import { useAudit } from "@/lib/audit/AuditProvider";
import {
  hasErrors,
  validateClient,
  type FieldErrors,
} from "@/lib/audit/validation";
import type { ClientDetails } from "@/lib/audit/types";

export default function ClientDetailsPage() {
  const router = useRouter();
  const { ready, state, setClient, markStarted } = useAudit();
  const [errors, setErrors] = useState<FieldErrors<ClientDetails>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateClient(state.client);
    setErrors(nextErrors);
    setSubmitted(true);
    if (hasErrors(nextErrors)) return;
    markStarted();
    router.push("/audit/business");
  }

  // Once the form has been submitted, errors update live so a corrected field
  // clears immediately rather than waiting for another submit.
  function update(patch: Partial<ClientDetails>) {
    setClient(patch);
    if (submitted) setErrors(validateClient({ ...state.client, ...patch }));
  }

  if (!ready) {
    return (
      <FlowShell>
        <FlowSkeleton />
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <StepHeading
        step="Step 1 of 3"
        title="First, who are we preparing this for?"
        description="Your report and proposal are addressed to you personally. Nothing is sent anywhere — this stays on your device."
      />

      <Card>
        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={state.client.fullName}
              onChange={(value) => update({ fullName: value })}
              error={errors.fullName}
              placeholder="Priya Sharma"
              autoComplete="name"
            />
            <SelectField
              label="Your role"
              value={state.client.role}
              onChange={(value) => update({ role: value })}
              options={ROLES}
              error={errors.role}
            />
            <TextField
              label="Work email"
              type="email"
              inputMode="email"
              value={state.client.email}
              onChange={(value) => update({ email: value })}
              error={errors.email}
              placeholder="priya@company.com"
              autoComplete="email"
            />
            <TextField
              label="Phone"
              type="tel"
              inputMode="tel"
              optional
              value={state.client.phone}
              onChange={(value) => update({ phone: value })}
              error={errors.phone}
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
            <ButtonLink href="/" variant="ghost" size="md">
              Back to home
            </ButtonLink>
            <Button type="submit" size="md">
              Continue
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

      <p className="mt-5 text-[13px] text-ink-muted">
        No account, no email verification, no data leaving the browser.
      </p>
    </FlowShell>
  );
}
