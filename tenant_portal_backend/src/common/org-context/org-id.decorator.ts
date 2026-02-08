import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../errors';
import { ErrorCode } from '../errors/error-codes.enum';

export const OrgId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const orgId = (req as any).org?.orgId as string | undefined;
  if (!orgId) {
    throw ApiException.forbidden(
      ErrorCode.AUTH_FORBIDDEN,
      'Organization context is required for this endpoint',
    );
  }
  return orgId;
});
