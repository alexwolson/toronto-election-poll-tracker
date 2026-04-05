"""Part 7: Simulation Engine.

Runs thousands of Monte Carlo draws to produce win probabilities and 
council composition distributions.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def inv_logit(x: float) -> float:
    """The sigmoid function: 1 / (1 + exp(-x))."""
    return 1.0 / (1.0 + np.exp(-x))


class WardSimulation:
    def __init__(
        self,
        ward_data: pd.DataFrame,
        mayoral_averages: pd.DataFrame,
        coattails: pd.DataFrame,
        challengers: pd.DataFrame,
        leans: pd.DataFrame,
        n_draws: int = 5000,
        seed: int = 42,
    ):
        """
        ward_data: [ward, councillor_name, is_running, defeatability_score, ...]
        mayoral_averages: [candidate, share]
        coattails: [ward, coattail_adjustment]
        challengers: [ward, candidate_name, name_recognition_tier, mayoral_alignment, ...]
        leans: [ward, candidate, lean]
        """
        self.ward_data = ward_data
        self.mayoral_averages = mayoral_averages
        self.coattails = coattails
        self.challengers = challengers
        self.leans = leans
        self.n_draws = n_draws
        self.rng = np.random.default_rng(seed)

    def _compute_candidate_strength(
        self, 
        cand: pd.Series, 
        mayoral_mood: dict[str, float],
        ward_num: int
    ) -> float:
        """Compute mu_j (Stage 2 strength)."""
        tier_baselines = {
            "well-known": 2.0,
            "known": 1.0,
            "unknown": 0.0
        }
        mu_tier = tier_baselines.get(cand["name_recognition_tier"], 0.0)
        
        w_a = 2.0
        alignment = cand["mayoral_alignment"]
        boost = 0.0
        if alignment != "unaligned":
            lean_row = self.leans[
                (self.leans["ward"] == ward_num) & 
                (self.leans["candidate"] == alignment)
            ]
            if not lean_row.empty:
                lean = lean_row.iloc[0]["lean"]
                mood = mayoral_mood.get(alignment, 0.0)
                boost = w_a * (lean + (mood - 0.20))
                
        return mu_tier + boost

    def run(self) -> dict[str, Any]:
        """Run the Monte Carlo simulation."""
        
        # 1. Prepare Mayoral Dirichlet
        eff_n = 2000
        candidates = self.mayoral_averages["candidate"].tolist()
        shares = self.mayoral_averages["share"].to_numpy()
        shares = shares / shares.sum()
        alpha = shares * eff_n

        # 2. Results storage
        n_wards = 25
        winner_names = np.empty((self.n_draws, n_wards), dtype=object)
        incumbent_wins_count = np.zeros(self.n_draws)
        
        # Decomposed effects for explanatory factors
        # shape: (n_draws, n_wards)
        vuln_effects = np.zeros((self.n_draws, n_wards))
        coat_effects = np.zeros((self.n_draws, n_wards))
        chal_effects = np.zeros((self.n_draws, n_wards))

        # 3. Main Loop
        for i in range(self.n_draws):
            mayoral_draw = self.rng.dirichlet(alpha)
            mayoral_mood = dict(zip(candidates, mayoral_draw))
            chow_draw = mayoral_mood.get("chow", 0.0)
            chow_avg = self.mayoral_averages.loc[
                self.mayoral_averages["candidate"] == "chow", "share"
            ].iloc[0]
            
            for ward_idx in range(n_wards):
                ward_num = ward_idx + 1
                row = self.ward_data[self.ward_data["ward"] == ward_num].iloc[0]
                coat_row = self.coattails[self.coattails["ward"] == ward_num].iloc[0]
                ward_challengers = self.challengers[self.challengers["ward"] == ward_num]
                
                c_strengths = [
                    self._compute_candidate_strength(c_row, mayoral_mood, ward_num)
                    for _, c_row in ward_challengers.iterrows()
                ]
                f_star = max(c_strengths) if c_strengths else 0.0
                
                if not row["is_running"]:
                    prob = 0.0
                else:
                    d_w = row["defeatability_score"]
                    mood_factor = chow_draw / chow_avg if chow_avg > 0 else 1.0
                    c_w = coat_row["coattail_adjustment"] * mood_factor
                    
                    beta_0 = 4.0   
                    beta_1 = -0.05 
                    beta_2 = 3.0   
                    beta_3 = -0.5  
                    
                    # Log components for explanatory factors
                    vuln_effects[i, ward_idx] = beta_1 * d_w
                    coat_effects[i, ward_idx] = beta_2 * c_w
                    chal_effects[i, ward_idx] = beta_3 * f_star
                    
                    z = beta_0 + vuln_effects[i, ward_idx] + coat_effects[i, ward_idx] + chal_effects[i, ward_idx]
                    prob = inv_logit(z)
                
                if self.rng.random() < prob:
                    winner_names[i, ward_idx] = row["councillor_name"]
                    incumbent_wins_count[i] += 1
                else:
                    if not c_strengths:
                        winner_names[i, ward_idx] = "Generic Challenger"
                    else:
                        exp_s = np.exp(c_strengths)
                        probs = exp_s / exp_s.sum()
                        winner = self.rng.choice(ward_challengers["candidate_name"].values, p=probs)
                        winner_names[i, ward_idx] = winner
        
        # 4. Aggregate Results
        win_probs = {}
        factors = {}
        for ward_num in range(1, 26):
            ward_idx = ward_num - 1
            row = self.ward_data[self.ward_data["ward"] == ward_num].iloc[0]
            
            if not row["is_running"]:
                win_probs[ward_num] = 0.0
                factors[ward_num] = {"vuln": 0.0, "coat": 0.0, "chal": 0.0}
            else:
                win_probs[ward_num] = np.mean(winner_names[:, ward_idx] == row["councillor_name"])
                factors[ward_num] = {
                    "vuln": np.mean(vuln_effects[:, ward_idx]),
                    "coat": np.mean(coat_effects[:, ward_idx]),
                    "chal": np.mean(chal_effects[:, ward_idx]),
                }
        
        return {
            "win_probabilities": win_probs,
            "factors": factors,
            "composition_mean": incumbent_wins_count.mean(),
            "composition_std": incumbent_wins_count.std(),
            "composition_dist": incumbent_wins_count,
            "winner_matrix": winner_names,
        }
