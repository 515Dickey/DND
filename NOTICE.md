# Attribution

This work includes material from the System Reference Document 5.2 ("SRD 5.2")
by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The
SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International
License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Vellum is compatible with fifth edition.

## What is derived from the SRD

- `src/srd/classes.json` — class core traits, the features gained at each
  level, the rules text for each feature, and the nine species with their
  traits.
- `src/srd/spells.json` — all 339 spells with their stat blocks and full text.

Both are generated from the SRD PDF by `scripts/extract-srd.mjs`.

The generator is committed alongside the data so the extraction is auditable:
anyone can re-run it against the published PDF and diff the result.

## Regenerating

```bash
pdftotext -raw SRD_CC_v5.2.pdf srd-raw.txt
```

```bash
node scripts/extract-srd.mjs srd-raw.txt src/srd/classes.json
```

Use `-raw`, not `-layout`. Layout mode drifts the multi-column tables out of
alignment and silently corrupts them, which for game data players rely on is
worse than failing outright. The generator refuses to finish quietly: it checks
every class for a complete 20-level table and for table columns bleeding into
feature names, and exits non-zero if anything looks wrong.
