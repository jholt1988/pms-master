import { ApartmentsComSyndicationAdapter } from '../apartments-com.adapter';
import { PropertyMarketingSnapshot } from '../listing-syndication.adapter';

describe('ApartmentsComSyndicationAdapter', () => {
  const adapter = new ApartmentsComSyndicationAdapter();
  const snapshot: PropertyMarketingSnapshot = {
    property: { id: 2, name: 'Apt Hub', address: '200 River Rd' },
    marketingProfile: { minRent: 900, maxRent: 1500, availabilityStatus: 'LIMITED' },
    photos: [{ url: 'https://cdn.test/unit.jpg', caption: 'Unit', isPrimary: true }],
    amenities: [{ key: 'gym', label: 'Fitness Center', isFeatured: true }],
    unitCount: 20,
  };

  it('creates feed-friendly payloads', () => {
    const payload = adapter.buildPayload(snapshot);
    expect(payload).toMatchObject({
      rentRange: '900-1500',
      amenities: [{ key: 'gym', label: 'Fitness Center', featured: true }],
      photos: expect.arrayContaining([expect.objectContaining({ order: 1 })]),
    });
  });

  it('requires FTP credentials before sending', async () => {
    const payload = adapter.buildPayload(snapshot);
    await expect(
      adapter.send(payload, { ftpHost: 'ftp.example.com', ftpUsername: 'user', ftpPassword: 'secret' }),
    ).resolves.toMatchObject({ success: true });

    await expect(adapter.send(payload, { ftpHost: 'ftp.example.com' })).rejects.toThrow(
      'Apartments.com FTP credentials are required',
    );
  });
});
