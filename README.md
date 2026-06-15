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
  -> operations:  native loads + external tables (BigLake/Parquet + plain external NDJSON->native JSON column) + serverless Spark stored procedures
  -> bronze:      typed, with ingestion metadata (_batch_id, _ingested_at, _record_hash)
  -> silver:      conformed, cleaned, deduplicated; Gemini multilingual feedback enrichment
  -> gold:        ATOMIC star schema (dim_terminal, dim_airline, dim_date, fct_flight, fct_baggage, fct_feedback) + gold_data_quality_summary
  -> semantic:    VIEWS that roll up at query time (the "semantic layer" teaching artifact)
  -> assertions:  data-quality gates (quality stage)
  -> security:    RLS + CLS governance showcase (self-contained staff_directory)
```

### The semantic-layer point

Gold is modelled at the **finest (atomic) grain**. Roll-ups live in the
`airport_semantic` **views** — computed at query time, nothing materialised.
That view layer is a hand-rolled "mini semantic layer"; in production you would
replace it with Looker / AtScale / Cube. Heavy transformation belongs in
Dataform (here); the semantic layer only aggregates.

## Tags (stages)

`setup` → `ingestion` → `bronze` → `silver` → `gold` → `semantic` → `quality` → `security`

The Composer DAG runs one stage per tag, in this order. Each medallion layer is
its own stage, so the flow is visible in the Airflow graph.

Some actions also carry **secondary tags** (`spark` on the procedure DDL, `ai` on
the Gemini model + enrichment) for convenience when running subsets locally; these
are not pipeline stages and are not invoked separately by the DAG.

## Project structure

```
workflow_settings.yaml          # project, location, datasets, connections, batchId var
definitions/
  operations/   native loads, external tables (BigLake Parquet + plain external JSON column), Spark proc DDL + CALLs, Gemini model
  sources/      declarations.js (raw source declarations)
  bronze/       brz_*  typed + ingestion metadata
  silver/       slv_*  conformed/cleaned + slv_customer_feedback_enriched (Gemini)
  gold/         dim_* / fct_*  atomic star schema + gold_data_quality_summary
  semantic/     sem_*  query-time roll-up views
  assertions/   manual data-quality gates
  security/     RLS + CLS governance showcase (self-contained staff_directory)
includes/       reusable JS (the DRY layer)
```

### The `includes/` DRY layer

Business logic is defined once and referenced everywhere — this is the "model
once, reference many times" idea the demo teaches:

- `constants.js` — `TERMINALS`, `SLA` thresholds, and the allowed `SENTIMENTS` /
  `URGENCIES`. The allowed-value lists are imported by both the Gemini prompt and
  the sentiment assertion, so they can never drift.
- `metrics.js` — reusable metric SQL snippets (`delayBucket`, `isDelayed`,
  `isWaitBreach`) consumed by the silver/gold models.
- `prompts.js` — the Gemini feedback-enrichment prompt (consumes the allowed
  values from `constants.js`).

## Design docs

The *why* behind this structure lives in the companion repo:

- [`docs/design-philosophy.md`](https://github.com/johanesalxd/airport-ops-lakehouse-demo/blob/main/docs/design-philosophy.md) — medallion + why gold is an atomic star schema, not the semantic layer.
- [`docs/architecture.md`](https://github.com/johanesalxd/airport-ops-lakehouse-demo/blob/main/docs/architecture.md) — tech stack, infrastructure, how this repo connects to GCP Dataform + Composer.

## Local development

```bash
npm install
npx @dataform/cli compile
```

## Settings

See `workflow_settings.yaml`. Reusable BigQuery connections are referenced by
variable (`sparkConnection`, `geminiConnection`, `biglakeConnection`).

The `security` stage additionally needs `governanceDataset` plus the four group
vars (`adminGroup`, `salesGroup`, `adminPrincipal`, `salesPrincipal`) in
`workflow_settings.yaml`, and the two referenced Google Groups must already exist
(the demo repo's `bootstrap.sh` grants them the read roles).
