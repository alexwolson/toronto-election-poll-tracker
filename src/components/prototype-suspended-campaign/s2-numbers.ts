// PROTOTYPE numbers (throwaway): PROTOTYPE numbers: S2 applied to backend-2026-10-06.1's 16,000 draws (kept fraction log-normal over all seven usable cases, NumPy seed 20260921). Not a release.
// Generated from the refit draws of backend-2026-10-06.1; keyed by display name.
export const S2_NUMBERS = {
  "published": {
    "candidates": {
      "Olivia Chow": {
        "median": 0.48468344975690286,
        "lower": 0.3503043186562984,
        "upper": 0.6098914653579866,
        "win_probability": 0.75375
      },
      "Brad Bradford": {
        "median": 0.36646859282919486,
        "lower": 0.24382690278710276,
        "upper": 0.49363085451886923,
        "win_probability": 0.244125
      },
      "Chris Alexander": {
        "median": 0.06658801066273617,
        "lower": 0.01982419578603659,
        "upper": 0.13465936437625747,
        "win_probability": 0.002125
      }
    },
    "pairwise_margin": {
      "median": 11.638169252313347,
      "lower": -11.604449574137943,
      "upper": 34.16578041346047,
      "probability_challenger_ahead": 0.24475,
      "outcomes": {
        "close_threshold_points": 2.0,
        "leader_ahead": 0.717625,
        "close": 0.069375,
        "challenger_ahead": 0.213
      }
    }
  },
  "s2": {
    "candidates": {
      "Olivia Chow": {
        "median": 0.5197068289608497,
        "lower": 0.37871532965223,
        "upper": 0.6452442650688417,
        "win_probability": 0.75525
      },
      "Brad Bradford": {
        "median": 0.39275171631735184,
        "lower": 0.26225922496107423,
        "upper": 0.5245487821253436,
        "win_probability": 0.24475
      },
      "Chris Alexander": {
        "median": 0.009810198418014095,
        "lower": 0.002230822275373312,
        "upper": 0.033226275186449564,
        "win_probability": 0.0
      }
    },
    "pairwise_margin": {
      "median": 12.449583101068287,
      "lower": -12.494500054113677,
      "upper": 36.49194872798665,
      "probability_challenger_ahead": 0.24475,
      "outcomes": {
        "close_threshold_points": 2.0,
        "leader_ahead": 0.719875,
        "close": 0.0653125,
        "challenger_ahead": 0.2148125
      }
    }
  }
} as const;

// PROTOTYPE: S2 full-ballot share of the residual pool plus Alexander, summed per draw
// before taking quantiles (same draws and kept-fraction seed as above).
export const OTHER_WITH_ALEXANDER = {
  median: 0.07167065552328905,
  lower: 0.03249690088229618,
  upper: 0.15922532347060406,
} as const;
