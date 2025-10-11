import { promises as fs } from 'fs';
import path from 'path';

export type Customer = {
  id: string;
  name: string;
  city?: string;
  region?: string;
  slug?: string;
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

export function resetCustomersCache() {
  customersCache = null;
}
