import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OrgIdOptional = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return (req as any).org?.orgId as string | undefined;
});
