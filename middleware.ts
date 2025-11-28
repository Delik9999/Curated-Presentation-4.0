import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
// Import customer data directly as JSON module (Edge runtime compatible)
import customersData from '@/data/customershorted.json';

type Customer = {
  id: string;
  name: string;
  city?: string;
  region?: string;
  slug?: string;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect customer routes: /customers/[id]
  if (pathname.startsWith('/customers/')) {
    // Extract customer ID from path
    const customerIdMatch = pathname.match(/^\/customers\/([^\/]+)/);
    if (!customerIdMatch) {
      return NextResponse.next();
    }

    const customerId = customerIdMatch[1];

    // Use imported customer data (Edge runtime compatible)
    const customers = customersData as Customer[];
    const customer = customers.find(
      (c) => c.id === customerId || c.slug === customerId
    );

    if (!customer) {
      return NextResponse.next(); // Let 404 handle it
    }

    // Test customers (starting with !!) don't require auth
    const requiresAuth = !customer.name.startsWith('!!');

    // If customer doesn't require auth, allow access
    if (!requiresAuth) {
      return NextResponse.next();
    }

    // If customer requires auth, check session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'curated-presentation-secret-change-in-production',
    });

    // Check if user is authenticated for this customer or is admin
    const isAdmin = token?.role === 'admin';
    const isAuthorizedCustomer = token?.customerId === customer.id;

    if (!isAdmin && !isAuthorizedCustomer) {
      // Redirect to customer-specific login URL (helps password managers)
      const signInUrl = new URL(`/auth/signin/${customer.id}`, request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect rep portal routes: /rep/*
  if (pathname.startsWith('/rep')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'curated-presentation-secret-change-in-production',
    });

    if (!token || token.role !== 'admin') {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      signInUrl.searchParams.set('type', 'admin');
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/customers/:path*', '/rep/:path*'],
};
