import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Determine the IP address tracking value
    let tracker = req.ips?.length ? req.ips[0] : req.ip; 

    // If the request has an authenticated user, append the tenantId or userId
    if (req.user && req.user.id) {
      tracker += `-${req.user.id}`;
    } else if (req.headers && req.headers['x-tenant-id']) {
      // Fallback in case of multi-tenant headless integrations
      tracker += `-${req.headers['x-tenant-id']}`;
    }

    return tracker;
  }
}
