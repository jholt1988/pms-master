import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { signHs256 } from "@propertyos/crypto";

@ApiTags("tokens")
@Controller("tokens")
export class TokensController {
  @Post("bundle-fetch")
  async issueBundleFetchToken(@Body() body: { tenant_id: string; bundle_hash: string; ttl_seconds?: number }) {
    const secret = process.env.JWT_HS256_SECRET || "dev-secret";
    const ttl = Math.max(5, Math.min(300, body.ttl_seconds ?? 60));
    const token = await signHs256({ typ:"bundle_fetch", tenant_id: body.tenant_id, bundle_hash: body.bundle_hash }, secret, ttl);
    return { token, expires_in: ttl };
  }
}
