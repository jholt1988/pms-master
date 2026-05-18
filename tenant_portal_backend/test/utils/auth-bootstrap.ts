import request from 'supertest';

type HttpApp = Parameters<typeof request>[0];

export async function loginAndGetToken(
  app: HttpApp,
  credentials: { username: string; password: string },
): Promise<string> {
  const response = await request(app).post('/auth/login').send(credentials).expect(201);
  const token = response.body?.access_token ?? response.body?.accessToken;
  if (!token) {
    throw new Error('Expected auth token in login response');
  }
  return token;
}
