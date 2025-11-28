import { NextResponse } from 'next/server';
import { loadCustomers } from '@/lib/customers/loadCustomers';

export async function GET() {
  try {
    const customers = await loadCustomers();

    // Map customers to include requiresAuth flag
    // Test customers (starting with !!) don't require auth
    const customersWithAuth = customers.map((customer) => ({
      ...customer,
      requiresAuth: !customer.name.startsWith('!!'),
    }));

    return NextResponse.json(customersWithAuth);
  } catch (error) {
    console.error('Error loading customers:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}
