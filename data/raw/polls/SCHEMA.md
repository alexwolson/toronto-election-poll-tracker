# polls.csv Schema

One row per published poll.

| Column | Type | Required | Description |
|---|---|---|---|
| `poll_id` | string | yes | Unique identifier, e.g. `liaison-2025-11-01` |
| `firm` | string | yes | Polling firm name |
| `date_conducted` | YYYY-MM-DD | yes | Date range end if a range was reported |
| `date_published` | YYYY-MM-DD | yes | |
| `sample_size` | integer | no | Blank if not reported |
| `methodology` | string | no | e.g. `online-panel`, `IVR`, `phone` |
| `field_tested` | string | yes | Comma-separated list of candidates tested |
| `chow` | float | no | Vote share as decimal (0.37, not 37) |
| `bradford` | float | no | Vote share as decimal |
| `bailao` | float | no | Vote share as decimal |
| `matlow` | float | no | Vote share as decimal |
| `furey` | float | no | Vote share as decimal |
| `undecided` | float | no | Share undecided |
| `notes` | string | no | Anything noteworthy |

## Validation rules
- Vote shares per row (all candidate columns + undecided) must sum to ≤ 1.0
- `date_conducted` must be ≤ `date_published`
- `sample_size` must be a positive integer if present
- `poll_id` must be unique across all rows
