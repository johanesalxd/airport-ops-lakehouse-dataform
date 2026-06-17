# airport-ops-lakehouse-dataform

Dataform project companion to `airport-ops-lakehouse-demo` for the Airport
Operations Lakehouse demo on Google Cloud.

This repository is the **transformation layer**. It is connected to a GCP
**Dataform repository** and invoked by a Cloud Composer DAG. The Dataform
project root lives here (`workflow_settings.yaml` + `definitions/`) because a GCP
Dataform repository expects the project at the Git repo root.

`workflow_settings.yaml` contains public-safe placeholders so the repository can
compile locally after cloning. In the full demo, runtime values come from the
demo repo's `.env`: `bootstrap.sh` writes Composer Airflow Variables, and the
Composer DAG passes Dataform `codeCompilationConfig` overrides for project,
location, assertion dataset, bucket, connection, dataset, and governance group
settings.

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
the Gemini model + enrichment, and `streaming` on the optional Pub/Sub dedupe
view) for convenience when running subsets locally; these are not pipeline stages
and are not invoked separately by the DAG.

## Project structure

```
workflow_settings.yaml          # public-safe defaults; Composer overrides at runtime
definitions/
  operations/   native loads, external tables (BigLake Parquet + plain external JSON column), Spark proc DDL + CALLs, Gemini model
  sources/      declarations.js (raw source declarations, including streaming bronze)
  bronze/       brz_*  typed + ingestion metadata
  silver/       slv_*  conformed/cleaned + slv_customer_feedback_enriched (Gemini)
  gold/         dim_* / fct_*  atomic star schema + gold_data_quality_summary
  semantic/     sem_*  query-time roll-up views
  assertions/   manual data-quality gates
  security/     RLS + CLS governance showcase (self-contained staff_directory)
includes/       reusable JS (the DRY layer)
```

## Optional streaming surface

The companion demo repo creates `airport_bronze.brz_baggage_events_stream` for a
Pub/Sub BigQuery subscription. Dataform declares that externally populated table
and builds `airport_silver.slv_baggage_events_stream_deduped`, a view that keeps
one row per `event_id` for the optional baggage streaming showcase.

Because the view is also tagged `silver`, the full Composer DAG validates that
the streaming surface exists even when the stream itself is not running. The demo
repo's `bootstrap.sh` creates the bronze stream table before the DAG runs.

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

The *why* behind this structure lives in the companion demo repo:

- `docs/design-philosophy.md` — medallion + why gold is an atomic star schema,
  not the semantic layer.
- `docs/architecture.md` — tech stack, infrastructure, how this repo connects to
  GCP Dataform + Composer.

## Local development

```bash
npm install
npm run compile
```

Local compile validates the SQLX graph against placeholder settings only. It does
not create BigQuery resources. For a real run, configure and bootstrap the demo
repo, then trigger the Composer DAG.

The compile script runs the Dataform CLI through `npx` instead of installing it
as a persistent dev dependency. This keeps the default dependency install small
and avoids pinning local-only CLI transitive dependencies in this repo.

## Settings

See `workflow_settings.yaml` for the variable names consumed by the SQLX graph.
Reusable BigQuery connections are referenced by variable (`sparkConnection`,
`geminiConnection`, `biglakeConnection`).

The `security` stage additionally needs `governanceDataset` plus the four group
vars (`adminGroup`, `salesGroup`, `adminPrincipal`, `salesPrincipal`). In the
full demo, these are supplied by Composer compilation overrides from the demo
repo. The two referenced Google Groups must already exist; the demo repo's
`bootstrap.sh` grants them the read roles.

Google Cloud references:

- [Configure Dataform workflow settings](https://docs.cloud.google.com/dataform/docs/manage-repository#configure-workflow-settings)
- [Configure Dataform compilation overrides](https://docs.cloud.google.com/dataform/docs/configure-compilation)
- [Schedule Dataform runs with Managed Airflow](https://docs.cloud.google.com/dataform/docs/schedule-runs)
