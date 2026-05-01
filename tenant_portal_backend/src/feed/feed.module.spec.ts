import { MODULE_METADATA } from '@nestjs/common/constants';
import { FeedModule } from './feed.module';
import { FeedController } from './feed.controller';
import { FeedController as LegacyFeedController } from './feed-aggregator.controller';

describe('FeedModule route registration', () => {
  it('registers only the canonical feed controller', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, FeedModule) ?? [];

    expect(controllers).toContain(FeedController);
    expect(controllers).not.toContain(LegacyFeedController);
  });
});
