import type { WardPoll, WardPollBenchmark } from "@/types/feeds";

export const benchmark: WardPollBenchmark = {
  method: "observed-named-candidate-error-span-v1", sample_count: 6, contest_count: 6,
  cycle_count: 1, pollster_count: 1, candidate_comparisons: 26,
  error_lower: -0.16, error_upper: 0.26, corpus_sha256: "a".repeat(64),
  sources: Array.from({ length: 6 }, (_, index) => ({ sample_id: `s${index}`, year: 2022,
    ward: String(index + 1), fieldwork_end: "2022-09-13", pollster: "Forum Research", source_url: "https://example.com/poll.pdf" })),
};
export const poll: WardPoll = {
  poll_id: "p", firm: "Forum Research", date_conducted: "2026-09-27", date_published: "2026-10-02",
  sample_size: 464, methodology: "IVR telephone and online panel; weighted for age and gender",
  denominator: "decided and leaning voters", ballot_status: "final_ballot_candidates", undecided_share: null,
  source_url: "https://example.com/current.pdf",
  candidates: [
    { candidate_id: "king", candidate_name: "Debbie King", share: 0.37, is_incumbent: false, is_residual: false, registration_status: "registered" },
    { candidate_id: "other", candidate_name: "Other candidates", share: 0.16, is_incumbent: false, is_residual: true, registration_status: "residual" },
  ],
  historical_context: { reading_id: "r", sample_id: "s", unweighted_base: 307, weighted_base: 331, reported_base: null,
    rows: [{ candidate_id: "king", candidate_name: "Debbie King", reported_share: 0.37, lower: 0.21, upper: 0.63 }] },
};

