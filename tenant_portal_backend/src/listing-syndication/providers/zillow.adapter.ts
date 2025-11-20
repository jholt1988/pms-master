import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { SyndicationChannel } from '@prisma/client';
import {
  ChannelCredential,
  ListingSyndicationAdapter,
  PropertyMarketingSnapshot,
  SyndicationResult,
} from './listing-syndication.adapter';

@Injectable()
export class ZillowSyndicationAdapter implements ListingSyndicationAdapter {
  readonly channel = SyndicationChannel.ZILLOW;

  buildPayload(snapshot: PropertyMarketingSnapshot): Record<string, unknown> {
    return {
      propertyId: snapshot.property.id,
      address: snapshot.property.address,
      name: snapshot.property.name,
      rent: {
        min: snapshot.marketingProfile?.minRent,
        max: snapshot.marketingProfile?.maxRent,
      },
      availability: snapshot.marketingProfile?.availabilityStatus,
      availableOn: snapshot.marketingProfile?.availableOn,
      headline: snapshot.marketingProfile?.marketingHeadline,
      description: snapshot.marketingProfile?.marketingDescription,
      photos: snapshot.photos.map((photo) => ({
        url: photo.url,
        caption: photo.caption,
        primary: photo.isPrimary ?? false,
      })),
      amenities: snapshot.amenities.map((amenity) => amenity.label),
      unitCount: snapshot.unitCount,
    };
  }

  validate(payload: Record<string, unknown>): void {
    if (!payload['propertyId'] || !payload['name']) {
      throw new Error('Zillow payload is missing property identifiers');
    }

    const photos = payload['photos'] as unknown[] | undefined;
    if (!photos || photos.length === 0) {
      throw new Error('Zillow payload requires at least one marketing photo');
    }
  }

  async send(payload: Record<string, unknown>, credentials: ChannelCredential): Promise<SyndicationResult> {
    this.validate(payload);

    if (!credentials?.apiKey) {
      throw new Error('Zillow API key is required for syndication');
    }

    if (credentials.endpoint) {
      const response = await axios.post(credentials.endpoint, payload, {
        headers: {
          'X-API-KEY': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: response.status >= 200 && response.status < 300,
        message: 'Zillow syndication request submitted',
        rawResponse: response.data,
      };
    }

    return {
      success: true,
      message: 'Zillow payload validated (mocked send)',
    };
  }
}
