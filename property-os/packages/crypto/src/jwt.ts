import { SignJWT, jwtVerify } from "jose";
export type JwtClaims = Record<string, unknown>;
export async function signHs256(claims: JwtClaims, secret: string, expiresInSeconds: number): Promise<string> {
  const now = Math.floor(Date.now()/1000);
  return await new SignJWT(claims).setProtectedHeader({ alg:"HS256", typ:"JWT" }).setIssuedAt(now).setExpirationTime(now+expiresInSeconds)
    .sign(new TextEncoder().encode(secret));
}
export async function verifyHs256(token: string, secret: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload as JwtClaims;
}
