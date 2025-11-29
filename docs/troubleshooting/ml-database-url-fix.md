# DATABASE_URL Schema Parameter Fix

**Issue:** psycopg2 doesn't accept the `schema=public` query parameter that Prisma uses in DATABASE_URL.

**Error:**
```
Database error: invalid dsn: invalid URI query parameter: "schema"
```

**Status:** ✅ FIXED

---

## Problem

Prisma's DATABASE_URL format includes `?schema=public`:
```
postgresql://user:pass@localhost:5432/db?schema=public
```

However, `psycopg2` doesn't recognize the `schema` parameter and throws an error.

---

## Solution

The `fetch_from_database()` function now automatically:

1. **Parses the DATABASE_URL**
2. **Removes the `schema` parameter**
3. **Rebuilds the URL without it**
4. **Connects using the cleaned URL**

**Code Added:**
```python
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

parsed = urlparse(database_url)
query_params = parse_qs(parsed.query, keep_blank_values=True)

# Remove 'schema' parameter if present (Prisma uses it, but psycopg2 doesn't)
query_params.pop('schema', None)

# Rebuild URL without schema parameter
if query_params:
    cleaned_query = urlencode(query_params, doseq=True)
else:
    cleaned_query = ''
    
cleaned_url = urlunparse((
    parsed.scheme,
    parsed.netloc,
    parsed.path,
    parsed.params,
    cleaned_query,
    parsed.fragment
))

# Clean up trailing '?' if present
if cleaned_url.endswith('?'):
    cleaned_url = cleaned_url[:-1]
    
conn = psycopg2.connect(cleaned_url)
```

---

## Testing

After the fix, your DATABASE_URL can include `?schema=public` and it will work:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/tenant_portal?schema=public"

python scripts/extract_training_data.py
```

**Expected Output:**
```
DATABASE_URL found. Attempting to fetch from database...
Successfully fetched 26 units from database
```

No more errors about the schema parameter!

---

## What Changed

- ✅ Added URL parsing to remove `schema` parameter
- ✅ Handles URLs with or without query parameters
- ✅ Cleans up trailing `?` characters
- ✅ Preserves other query parameters if present

---

**Status:** ✅ Fixed - Database extraction now works with Prisma-style DATABASE_URL

