# Product QA Reports

Save immutable Markdown and JSON pairs:

```text
reports/features/<initiative-slug>/<yyyy-mm-dd>-<commit>.md
reports/features/<initiative-slug>/<yyyy-mm-dd>-<commit>.json
reports/full/<yyyy-mm-dd>-<commit>.md
reports/full/<yyyy-mm-dd>-<commit>.json
```

Use a run suffix for the same commit (`-r2`, `-r3`). Never rewrite history to
improve a score. Keep credentials, PII, protected payloads, raw database dumps,
screenshots, videos, traces, and downloads outside versioned reports.

Validate JSON reports from the repository root:

```bash
uv run --with jsonschema python -m jsonschema \
  -i docs/product-qa/reports/<report>.json \
  docs/product-qa/report.schema.json
```
