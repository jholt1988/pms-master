import { Injectable } from '@nestjs/common';
import { SyndicationChannel } from '@prisma/client';
import {
  ChannelCredential,
  ListingSyndicationAdapter,
  PropertyMarketingSnapshot,
  SyndicationResult,
} from './listing-syndication.adapter';

@Injectable()
export class ApartmentsComSyndicationAdapter implements ListingSyndicationAdapter {
  readonly channel = SyndicationChannel.APARTMENTS_DOT_COM;

  buildPayload(snapshot: PropertyMarketingSnapshot): Record<string, unknown> {
    return {
      propertyId: snapshot.property.id,
      name: snapshot.property.name,
      address: snapshot.property.address,
      availability: snapshot.marketingProfile?.availabilityStatus,
      rentRange: `${snapshot.marketingProfile?.minRent ?? 0}-${snapshot.marketingProfile?.maxRent ?? 0}`,
      units: snapshot.unitCount,
      amenities: snapshot.amenities.map((amenity) => ({
        key: amenity.key,
        label: amenity.label,
        featured: amenity.isFeatured ?? false,
      })),
      photos: snapshot.photos.map((photo, index) => ({
        url: photo.url,
        caption: photo.caption,
        order: index + 1,
      })),
    };
  }

  validate(payload: Record<string, unknown>): void {
    if (!payload['address']) {
      throw new Error('Apartments.com payload missing address');
    }
  }

  async send(payload: Record<string, unknown>, credentials: ChannelCredential): Promise<SyndicationResult> {
    this.validate(payload);

    if (!credentials?.ftpHost || !credentials.ftpUsername || !credentials.ftpPassword) {
      throw new Error('Apartments.com FTP credentials are required');
    }

    // Simulate the FTP drop by returning the rendered payload
    const renderedFeed = JSON.stringify(payload);

    return {
      success: true,
      message: `Feed prepared for ${credentials.ftpHost}`,
      rawResponse: renderedFeed,
    };
  }
}
