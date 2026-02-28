import { Injectable, HttpService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RentalApplicationAiService {
  private readonly aiServiceUrl = process.env.AI_PRESCREENING_SERVICE_URL || 'http://localhost:8001';

  constructor(private readonly httpService: HttpService) {}

  async getAiReview(applicationId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/review`, {
          application_id: applicationId,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Error getting AI review:', error.response?.data || error.message);
      throw new Error('Failed to get AI review from prescreening service.');
    }
  }
}
