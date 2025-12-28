# Data Quality SLOs

## Availability & Freshness
| SLO | Target | Measurement |
| --- | --- | --- |
| Marketing profile sync freshness | 95% within 24h | `PropertyMarketingProfile.lastSyncedAt` |

## Completeness
| SLO | Target | Measurement |
| --- | --- | --- |
| Property address completeness | > 99% | Null rate of address/city/state/zip |
| User identity completeness | > 99% | Null rate of email/phone/first/last name |

## Validity
| SLO | Target | Measurement |
| --- | --- | --- |
| Email validity | > 99% | Regex validation count |
| Phone validity | > 99% | E.164 validation count |
| Rent range correctness | 100% | minRent <= maxRent |
| Geo validity | 100% | lat/long within range |

## Uniqueness
| SLO | Target | Measurement |
| --- | --- | --- |
| Duplicate properties | < 0.1% | Normalized address duplicates |
| Duplicate users | < 0.1% | Email duplicates; phone+name fallback |

## Monitoring & Alerting
- Run `scripts/data-quality/profiling.sql` weekly.
- Alert if any SLO threshold is breached for two consecutive runs.
- Store incidents and remediation notes in the analytics runbook.
