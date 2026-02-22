# Legal Documents (Placeholder)

This folder contains **placeholder** legal documents for the PMS demo.
Use these files to simulate user acceptance tracking in product flows.

## Versioning source of truth
- **Document version** lives in each legal doc as `Version:`
- **Effective date** lives in each legal doc as `Effective:`
- When you update legal terms, **bump the Version** and **update Effective**
- Product events should record:
  - `termsVersion`
  - `privacyVersion`
  - `acceptedAt`

## Routes used in UX
- `/legal/terms`
- `/legal/privacy`

These are placeholders; update to the final URLs when legal pages are published.
