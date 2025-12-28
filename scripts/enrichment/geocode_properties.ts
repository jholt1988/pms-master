import { Prisma, PrismaClient } from '../../tenant_portal_backend/node_modules/@prisma/client';

const prisma = new PrismaClient();

const geocodingApiUrl = process.env.GEOCODING_API_URL;
const geocodingApiKey = process.env.GEOCODING_API_KEY;
const geocodingSource = process.env.GEOCODING_SOURCE || 'external-geocoder';

type GeocodeResult = {
  latitude: number;
  longitude: number;
  confidence?: number;
  raw: unknown;
};

const ensureMetadataTable = async (): Promise<void> => {
  await prisma.$executeRaw(
    Prisma.sql`
      CREATE TABLE IF NOT EXISTS property_enrichment_metadata (
        property_id integer PRIMARY KEY,
        source text NOT NULL,
        confidence numeric,
        updated_at timestamptz NOT NULL DEFAULT now(),
        payload jsonb NOT NULL
      );
    `,
  );
};

const buildGeocodingUrl = (address: string): string => {
  if (!geocodingApiUrl) {
    throw new Error('GEOCODING_API_URL must be set for geocoding enrichment.');
  }

  if (geocodingApiUrl.includes('{{query}}')) {
    return geocodingApiUrl.replace('{{query}}', encodeURIComponent(address));
  }

  const connector = geocodingApiUrl.includes('?') ? '&' : '?';
  return `${geocodingApiUrl}${connector}q=${encodeURIComponent(address)}&format=json&limit=1`;
};

const parseGeocodeResponse = (payload: any): GeocodeResult | null => {
  if (!payload) {
    return null;
  }

  const result = Array.isArray(payload)
    ? payload[0]
    : payload.results?.[0] ?? payload;

  if (!result) {
    return null;
  }

  const latitude = Number(result.lat ?? result.latitude ?? result.geometry?.location?.lat);
  const longitude = Number(result.lon ?? result.lng ?? result.longitude ?? result.geometry?.location?.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    confidence: Number(result.confidence ?? result.score ?? result.importance ?? 0) || undefined,
    raw: payload,
  };
};

const fetchGeocode = async (address: string): Promise<GeocodeResult | null> => {
  const url = buildGeocodingUrl(address);
  const response = await fetch(url, {
    headers: geocodingApiKey ? { Authorization: `Bearer ${geocodingApiKey}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return parseGeocodeResponse(payload);
};

const run = async (): Promise<void> => {
  await ensureMetadataTable();

  const properties = await prisma.property.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
      address: { not: null },
      city: { not: null },
      state: { not: null },
      zipCode: { not: null },
    },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  for (const property of properties) {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
    const geocode = await fetchGeocode(address);

    if (!geocode) {
      continue;
    }

    await prisma.$transaction([
      prisma.property.update({
        where: { id: property.id },
        data: {
          latitude: geocode.latitude,
          longitude: geocode.longitude,
        },
      }),
      prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO property_enrichment_metadata (property_id, source, confidence, updated_at, payload)
          VALUES (
            ${property.id},
            ${geocodingSource},
            ${geocode.confidence ?? null},
            now(),
            ${JSON.stringify(geocode.raw)}
          )
          ON CONFLICT (property_id) DO UPDATE SET
            source = EXCLUDED.source,
            confidence = EXCLUDED.confidence,
            updated_at = EXCLUDED.updated_at,
            payload = EXCLUDED.payload;
        `,
      ),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

run()
  .catch((error) => {
    console.error('Geocoding enrichment failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
