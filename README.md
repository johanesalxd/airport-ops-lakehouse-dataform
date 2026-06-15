# airport-ops-lakehouse-dataform

Dataform project (companion to
[`airport-ops-lakehouse-demo`](https://github.com/johanesalxd/airport-ops-lakehouse-demo))
for the Airport Operations Lakehouse demo on Google Cloud.

This repository is the **transformation layer**. It is connected to a GCP
**Dataform repository** and invoked by a Cloud Composer DAG. The Dataform
project root lives here (`workflow_settings.yaml` + `definitions/`) because a GCP
Dataform repository expects the project at the Git repo root.

## What it does

```
raw GCS files
  -> operations:  native loads + BigLake external table + serverless Spark stored procedures
  -> bronze:      typed, with ingestion metadata (_batch_id, _ingested_at, _record_hash)
  -> silver:      conformed, cleaned, deduplicated; Gemini multilingual feedback enrichment
  -> gold:        ATOMIC star schema (dim_terminal, dim_airline, dim_date, fct_flight, fct_baggage, fct_feedback)
  -> semantic:    VIEWS that roll up at query time (the "semantic layer" teaching artifact)
  -> assertions:  data-quality gates
```

### The semantic-layer point

Gold is modelled at the **finest (atomic) grain**. Roll-ups live in the
`airport_semantic` **views** — computed at query time, nothing materialised.
That view layer is a hand-rolled "mini semantic layer"; in production you would
replace it with Looker / AtScale / Cube. Heavy transformation belongs in
Dataform (here); the semantic layer only aggregates.

## Tags (stages)

`setup` → `ingestion` → `bronze` → `silver` → `gold` → `semantic` → `quality`

The Composer DAG runs one stage per tag, in this order.

## Local development

```bash
npm install
npx @dataform/cli compile
```

## Settings

See `workflow_settings.yaml`. Reusable BigQuery connections are referenced by
variable (`sparkConnection`, `geminiConnection`, `biglakeConnection`).
