import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validateConfidenceV16, assertConfidenceV16Invariants } from '../property-os/v16-contract';

@Injectable()
export class PropertyOsV16ValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // This middleware assumes the target endpoint receives a JSON body
    // with a 'confidence' property that must adhere to the v1.6 contract.
    const confidencePayload = req.body?.confidence;

    if (!confidencePayload) {
      throw new BadRequestException('Missing required "confidence" property in request body.');
    }

    try {
      // Step 1: Validate the shape and types of the confidence object.
      const validatedConfidence = validateConfidenceV16(confidencePayload);

      // Step 2: Assert the mathematical invariants of the confidence object.
      assertConfidenceV16Invariants(validatedConfidence);

      // Attach the validated (and typed) object to the request for downstream services.
      // This is a common pattern to avoid re-validation.
      (req as any).validatedConfidenceV16 = validatedConfidence;

      next();
    } catch (error) {
      // If validation fails (either from Zod or the invariant assertion),
      // throw a BadRequestException with the detailed error message.
      throw new BadRequestException(`Property OS v1.6 Contract Violation: ${error.message}`);
    }
  }
}
