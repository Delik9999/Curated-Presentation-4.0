import { promises as fs } from 'fs';
import path from 'path';

export type Customer = {
  id: string;
  name: string;
  city?: string;
  region?: string;
  slug?: string;
  requiresAuth?: boolean;
  authorizedVendors?: string[]; // Vendor IDs this customer has accounts with
  logoUrl?: string; // Customer logo URL for white-label experience

  // Alignment Engine v1 fields
  influenceTier?: 'A' | 'B' | 'C'; // Dealer influence tier
  influenceWeight?: number; // Numeric weight for trend calculations (A=3, B=2, C=1)
  targetPieces?: number; // Promo target (e.g., 16 pieces for tier B)
  targetDollars?: number; // Optional: minimum display spend
};

let customersCache: Customer[] | null = null;

async function readCustomersFile(): Promise<Customer[]> {
  const filePath = path.join(process.cwd(), 'data', 'customershorted.json');
  const file = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(file) as Customer[];
}

export async function loadCustomers(): Promise<Customer[]> {
  if (!customersCache) {
    customersCache = await readCustomersFile();
  }
  return customersCache;
}

export async function findCustomer(idOrSlug: string): Promise<Customer | null> {
  const customers = await loadCustomers();
  const match = customers.find((customer) =>
    customer.id.toLowerCase() === idOrSlug.toLowerCase() ||
    customer.slug?.toLowerCase() === idOrSlug.toLowerCase()
  );
  return match ?? null;
}

export function getCustomerUrl(idOrSlug: string): string {
  return `/customers/${idOrSlug}`;
}

export function getAuthorizedVendors(customer: Customer): string[] {
  // Default to lib-and-co if no vendors specified (backward compatibility)
  return customer.authorizedVendors ?? ['lib-and-co'];
}

export function resetCustomersCache() {
  customersCache = null;
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Omit<Customer, 'id'>>
): Promise<Customer> {
  const customers = await readCustomersFile();
  const customerIndex = customers.findIndex((c) => c.id === customerId);

  if (customerIndex === -1) {
    throw new Error(`Customer with id "${customerId}" not found`);
  }

  const updatedCustomer = {
    ...customers[customerIndex],
    ...updates,
  };

  customers[customerIndex] = updatedCustomer;

  // Write updated customers back to file
  const filePath = path.join(process.cwd(), 'data', 'customershorted.json');
  await fs.writeFile(filePath, JSON.stringify(customers, null, 2), 'utf-8');

  // Clear cache to force reload
  resetCustomersCache();

  return updatedCustomer;
}
