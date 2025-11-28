import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAuthorizedVendors, type Customer } from '@/lib/customers/loadCustomers';

// GET - Get authorized vendors for a customer
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const filePath = path.join(process.cwd(), 'data', 'customershorted.json');
    const file = await fs.readFile(filePath, 'utf-8');
    const customers = JSON.parse(file) as Customer[];

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      customerId: customer.id,
      customerName: customer.name,
      authorizedVendors: getAuthorizedVendors(customer),
    });
  } catch (error) {
    console.error('Failed to get customer vendors:', error);
    return NextResponse.json(
      { error: 'Failed to get customer vendors' },
      { status: 500 }
    );
  }
}

// POST - Update authorized vendors for a customer
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();
    const { authorizedVendors } = body as { authorizedVendors: string[] };

    if (!Array.isArray(authorizedVendors)) {
      return NextResponse.json(
        { error: 'authorizedVendors must be an array' },
        { status: 400 }
      );
    }

    // Read customers file
    const filePath = path.join(process.cwd(), 'data', 'customershorted.json');
    const file = await fs.readFile(filePath, 'utf-8');
    const customers = JSON.parse(file) as Customer[];

    // Find and update customer
    const customerIndex = customers.findIndex((c) => c.id === customerId);
    if (customerIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    customers[customerIndex].authorizedVendors = authorizedVendors;

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(customers, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      customerId: customers[customerIndex].id,
      authorizedVendors: customers[customerIndex].authorizedVendors,
    });
  } catch (error) {
    console.error('Failed to update customer vendors:', error);
    return NextResponse.json(
      { error: 'Failed to update customer vendors' },
      { status: 500 }
    );
  }
}
