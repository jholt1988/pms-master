import { NextRequest, NextResponse } from 'next/server';

const backendBaseUrl = process.env.OPERATOR_API_BASE_URL ?? 'http://localhost:3001';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamPath = path.join('/');
  const upstreamUrl = new URL(`/api/${upstreamPath}`, backendBaseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('authorization', authorization);
  }
  headers.set('accept', 'application/json');

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    cache: 'no-store',
  });

  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
