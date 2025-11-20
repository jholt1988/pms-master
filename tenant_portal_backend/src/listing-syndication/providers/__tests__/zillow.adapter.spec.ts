import { ZillowSyndicationAdapter } from '../zillow.adapter';
import { PropertyMarketingSnapshot } from '../listing-syndication.adapter';

describe('ZillowSyndicationAdapter', () => {
  const adapter = new ZillowSyndicationAdapter();
  const snapshot: PropertyMarketingSnapshot = {
    property: { id: 1, name: 'Test', address: '100 Main St' },
    marketingProfile: {
      minRent: 1200,
      maxRent: 1800,
      availabilityStatus: 'AVAILABLE',
      availableOn: '2024-01-01',
      marketingHeadline: 'Great spot',
      marketingDescription: 'Walkable to everything',
    },
    photos: [{ url: 'https://cdn.test/photo.jpg', caption: 'Front view', isPrimary: true }],
    amenities: [{ key: 'pool', label: 'Pool' }],
    unitCount: 10,
  };

  it('builds Zillow payloads that include rent, photos, and amenities', () => {
    const payload = adapter.buildPayload(snapshot);

    expect(payload).toMatchObject({
      propertyId: 1,
      name: 'Test',
      rent: { min: 1200, max: 1800 },
      photos: [{ url: 'https://cdn.test/photo.jpg', primary: true }],
      amenities: ['Pool'],
    });
  });

  it('throws when photos are missing to mimic Zillow schema requirements', () => {
    const payload = adapter.buildPayload({
      ...snapshot,
      photos: [],
    });

    expect(() => adapter.validate(payload)).toThrow('Zillow payload requires at least one marketing photo');
  });
});
