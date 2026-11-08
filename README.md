# Kalibrr Jobs Feed (Philippines)

**New Philippine job listings from Kalibrr, delivered as a clean feed.** Run it daily and get only the jobs posted since your last run, with company, location, salary (when shown), skills and full description.

## Who it's for
- Job-board and aggregator builders, newsletter and Telegram/Slack job-alert channels
- Recruiters and staffing agencies tracking which companies are hiring and for what
- Market researchers measuring demand for roles and skills in Manila, Cebu and beyond

## How the alert works
- First run with a given `stateKey` returns every matching job and saves a baseline.
- Later runs (`mode: newSinceLastRun`) return **only jobs not seen before**. Set `mode` to full to get everything each time.
- **Schedule tip:** daily schedule (cron `0 6 * * *`) plus an Integration (Google Sheets, Slack, webhook). Use one `stateKey` per keyword set.

## Input
| Field | Meaning |
|---|---|
| `keywords` | e.g. `["python","customer service"]` |
| `cities` | e.g. `["Makati","Cebu City"]` |
| `functions` | Job function, e.g. `IT and Software` |
| `workFromHomeOnly` | Remote jobs only |
| `includeDescription` | Full job text on/off |
| `maxItems` | Cap per run |

## Example output
```json
{
  "title": "Data Analyst | Emerging Technologies",
  "company": "Questronix Corporation",
  "companyIndustry": "Information Technology / IT",
  "function": "IT and Software",
  "employmentType": "Full time",
  "city": "Makati",
  "country": "Philippines",
  "hybrid": true,
  "openings": 2,
  "postedAt": "2026-07-08T01:36:56Z",
  "applyBy": "2027-02-24T16:00:00Z",
  "url": "https://www.kalibrr.com/c/questronix-corporation/jobs/264238/data-analyst-emerging-technologies"
}
```

## Data and compliance
Public job-search pages only (no login, robots.txt permits it). Company job postings only, no candidate profiles or personal data. Please respect Kalibrr's terms for how you use the data.

## Call it from code
Get a token at https://console.apify.com/settings/integrations, then:

```python
from apify_client import ApifyClient

client = ApifyClient("<YOUR_APIFY_TOKEN>")
run = client.actor("datakit/kalibrr-jobs-feed").call(run_input={"keywords":["python"],"cities":["Makati"],"mode":"newSinceLastRun","stateKey":"py-makati"})
for row in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(row)
```

```bash
curl -X POST "https://api.apify.com/v2/acts/datakit~kalibrr-jobs-feed/run-sync-get-dataset-items?token=<YOUR_APIFY_TOKEN>" \
  -H "Content-Type: application/json" -d '{"keywords":["python"],"cities":["Makati"],"mode":"newSinceLastRun","stateKey":"py-makati"}'
```

## Run it on the Apify Store
Store page: https://apify.com/datakit/kalibrr-jobs-feed  (free to try; you only pay Apify platform usage)

Made by [datakit](https://github.com/datakit457). Part of the [datakit tools list](https://datakit457.github.io/).
