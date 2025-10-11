import { headers } from 'next/headers';

/**
 * Derives the base URL for server-side fetches that need an absolute origin.
 * Falls back to localhost during local development.
 */
export function getRequestBaseUrl(): string {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'https';

  if (host) {
    return `${protocol}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'http://localhost:3000'
  );
}
