import type { Ward } from "@/types/ward";

const FORECAST_REASON_LABELS: Record<string, string> = {
  candidate_field_not_final:
    "Nominations are still open, so the final candidate fields are not known.",
  minimum_incumbent_losses:
    "Toronto’s comparable history contains only eight incumbent defeats—too few to calibrate reliable ward odds.",
  beats_incumbent_base_rate:
    "The tested structural model did not outperform a simple historical incumbent-retention baseline.",
  calibration_artifact_missing:
    "Historical calibration diagnostics are temporarily unavailable.",
};

const RACE_REASON_LABELS: Record<string, string> = {
  no_running_incumbent: "There is no running incumbent.",
  high_structural_vulnerability:
    "The prior result places the incumbent among the most structurally exposed wards.",
  elevated_vulnerability_with_credible_challenger:
    "Structural exposure is paired with a challenger who has demonstrated electoral standing.",
  well_known_challenger:
    "At least one registered challenger has substantial public or electoral recognition.",
  strong_returning_runner_up:
    "A strong runner-up from the prior ward election is running again.",
  direct_ward_poll_available:
    "A current-field ward poll provides direct evidence of the contest.",
  no_competitive_trigger:
    "Current structural and candidate evidence does not meet a Competitive trigger.",
};

export function forecastReasonLabel(reason: string): string {
  return FORECAST_REASON_LABELS[reason] ?? reason.replaceAll("_", " ");
}

export function raceReasonLabel(reason: string): string {
  return RACE_REASON_LABELS[reason] ?? reason.replaceAll("_", " ");
}

export function wardRationale(ward: Ward): string {
  if (ward.race_class === "open") {
    return "There is no running incumbent, so this is an open contest rather than a re-election assessment.";
  }
  if (ward.race_class === "competitive") {
    return ward.race_status_reasons
      .map(raceReasonLabel)
      .join(" ");
  }
  return "The ward is rated Safe as a current evidence assessment: no competitive trigger is present. This is not a guarantee and not a published win probability.";
}

export function displayCouncilDate(value: string | null): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
