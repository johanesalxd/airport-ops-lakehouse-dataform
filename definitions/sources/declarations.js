// Declare the raw (control) tables that the ingestion operations populate, so
// the bronze models can ref() them and Dataform draws the lineage edges.

const control = dataform.projectConfig.vars.controlDataset;

[
  "raw_flight_schedules",
  "raw_flight_events",
  "raw_baggage_events",
  "raw_passenger_flow",
  "raw_security_wait",
  "raw_customer_feedback",
].forEach((name) => {
  declare({
    database: dataform.projectConfig.defaultDatabase,
    schema: control,
    name,
  });
});
