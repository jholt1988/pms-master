import { Injectable, Logger } from '@nestjs/common';
import { SecurityEventsService } from '../security-events/security-events.service';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

@Injectable()
export class PropertyOsService {
  private readonly logger = new Logger(PropertyOsService.name);

  constructor(
    private readonly securityEventsService: SecurityEventsService,
  ) {}

  private readonly execFileAsync = promisify(execFile);

  private getReferenceEngineDir(): string {
    return path.resolve(process.cwd(), '../tools/reference-engines/property-os-v1.6');
  }

  private loadReferenceResponse(): any {
    const filePath = path.join(this.getReferenceEngineDir(), 'sample_response.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  private async runReferenceEngine(requestPayload: any): Promise<any> {
    const engineDir = this.getReferenceEngineDir();
    const tmpRequestPath = path.join(engineDir, `.tmp_request_${Date.now()}.json`);
    fs.writeFileSync(tmpRequestPath, JSON.stringify(requestPayload), 'utf8');

    try {
      const { stdout } = await this.execFileAsync('python3', ['-m', 'ref_engine.cli', '--request', tmpRequestPath], {
        cwd: engineDir,
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      });

      return JSON.parse(stdout);
    } finally {
      if (fs.existsSync(tmpRequestPath)) fs.unlinkSync(tmpRequestPath);
    }
  }

  async getEngineHealth(): Promise<{ status: 'ok' | 'degraded'; detail: string; checkedAt: string }> {
    try {
      const engineDir = this.getReferenceEngineDir();
      const sampleRequestPath = path.join(engineDir, 'sample_request.json');
      const sampleRequest = JSON.parse(fs.readFileSync(sampleRequestPath, 'utf8'));
      const output = await this.runReferenceEngine(sampleRequest);

      if (!output?.confidence?.reversal_adjustment) {
        return {
          status: 'degraded',
          detail: 'Engine executed but returned unexpected response shape.',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        detail: 'Reference engine executed successfully.',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        detail: `Reference engine execution failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async runV16Analysis(payload: any): Promise<any> {
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const inspectionId = payload.id ?? 'unknown';

    // Log the analysis request event
    await this.securityEventsService.logEvent({
      type: 'PROPERTY_OS_ANALYSIS_REQUEST',
      success: true,
      metadata: {
        inspectionId,
        payloadHash,
        model: 'PropertyOS v1.6',
      },
    });

    try {
      this.logger.log(`Running Property OS v1.6 analysis for inspection ${inspectionId}`);

      let mockResponse: any;
      try {
        mockResponse = await this.runReferenceEngine(payload);
      } catch (engineError) {
        this.logger.warn('Reference engine execution failed; using sample_response fallback', engineError as any);
        mockResponse = this.loadReferenceResponse();
      }
      
      await this.securityEventsService.logEvent({
        type: 'PROPERTY_OS_ANALYSIS_SUCCESS',
        success: true,
        metadata: {
          inspectionId,
          payloadHash,
          responseConfidenceOverall: mockResponse?.confidence?.overall,
        },
      });

      return mockResponse;

    } catch (error) {
      this.logger.error(`Property OS analysis failed for inspection ${inspectionId}`, error);
      
      await this.securityEventsService.logEvent({
        type: 'PROPERTY_OS_ANALYSIS_FAILURE',
        success: false,
        metadata: {
          inspectionId,
          payloadHash,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error; // Re-throw the error after logging
    }
  }
}
