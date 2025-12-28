# Data Dictionary (Quality Scope)

## User
| Field | Type | Description | Rules |
| --- | --- | --- | --- |
| email | String | Primary email address | Required for active tenants; RFC-5322 regex |
| phoneNumber | String | Tenant phone number | Required for active tenants; E.164 format |
| firstName | String | Tenant first name | Required for active tenants |
| lastName | String | Tenant last name | Required for active tenants |

## Property
| Field | Type | Description | Rules |
| --- | --- | --- | --- |
| address | String | Street address | Required |
| city | String | City | Required |
| state | String | State code | Required; ISO-3166-2 US |
| zipCode | String | Postal code | Required |
| country | String | Country code | ISO-3166-1 alpha-2; default US |
| latitude | Float | Latitude | Range [-90, 90] |
| longitude | Float | Longitude | Range [-180, 180] |
| minRent | Float | Minimum rent | Must be <= maxRent |
| maxRent | Float | Maximum rent | Must be >= minRent |

## PropertyMarketingProfile
| Field | Type | Description | Rules |
| --- | --- | --- | --- |
| minRent | Float | Marketing min rent | Must be <= maxRent |
| maxRent | Float | Marketing max rent | Must be >= minRent |
| lastSyncedAt | DateTime | Syndication sync timestamp | Must meet SLA (24h) |

## PropertyPhoto
| Field | Type | Description | Rules |
| --- | --- | --- | --- |
| isPrimary | Boolean | Primary photo flag | Unique per property |

## Amenity
| Field | Type | Description | Rules |
| --- | --- | --- | --- |
| key | String | Amenity key | Normalized unique key |
| label | String | Amenity label | Normalized unique label |
