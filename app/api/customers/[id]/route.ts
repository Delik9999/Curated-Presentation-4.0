import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findCustomer, updateCustomer } from '@/lib/customers/loadCustomers';

const paramsSchema = z.object({ id: z.string().min(1) });

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  authorizedVendors: z.array(z.string()).optional(),
});

/**
 * GET /api/customers/[id]
 * Retrieve a single customer by ID
 */
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
  }

  try {
    const customer = await findCustomer(params.data.id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

/**
 * PUT /api/customers/[id]
 * Update customer information
 */
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Verify customer exists
    const existingCustomer = await findCustomer(params.data.id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Filter out undefined values to avoid overwriting with undefined
    const updates = Object.fromEntries(
      Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    );

    // Handle logoUrl: if explicitly null, we want to remove it from the customer object
    // So we omit it from updates rather than setting to undefined
    if (parsed.data.logoUrl !== null && parsed.data.logoUrl !== undefined) {
      updates.logoUrl = parsed.data.logoUrl;
    }

    const updatedCustomer = await updateCustomer(params.data.id, updates);

    return NextResponse.json({
      customer: updatedCustomer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update customer' },
      { status: 500 }
    );
  }
}
