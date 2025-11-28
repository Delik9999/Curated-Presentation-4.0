import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export type CustomerCredential = {
  customerId: string;
  username: string;
  passwordHash: string;
};

export type AdminCredential = {
  username: string;
  passwordHash: string;
  role: 'admin';
};

type CredentialsData = {
  customers: CustomerCredential[];
  admin: AdminCredential;
};

const CREDENTIALS_FILE = path.join(process.cwd(), 'data', 'credentials.json');

let credentialsCache: CredentialsData | null = null;

async function loadCredentialsFile(): Promise<CredentialsData> {
  try {
    const file = await fs.readFile(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(file) as CredentialsData;
  } catch {
    // Return default if file doesn't exist
    return {
      customers: [],
      admin: {
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10), // Default admin password
        role: 'admin',
      },
    };
  }
}

export async function loadCredentials(): Promise<CredentialsData> {
  if (!credentialsCache) {
    credentialsCache = await loadCredentialsFile();
  }
  return credentialsCache;
}

export async function findCustomerCredential(customerId: string): Promise<CustomerCredential | null> {
  const credentials = await loadCredentials();
  return credentials.customers.find((c) => c.customerId === customerId) ?? null;
}

export async function verifyCustomerCredentials(
  customerId: string,
  username: string,
  password: string
): Promise<boolean> {
  const credential = await findCustomerCredential(customerId);
  if (!credential) return false;
  if (credential.username !== username) return false;
  return await bcrypt.compare(password, credential.passwordHash);
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const credentials = await loadCredentials();
  if (credentials.admin.username !== username) return false;
  return await bcrypt.compare(password, credentials.admin.passwordHash);
}

export function resetCredentialsCache() {
  credentialsCache = null;
}

// Helper to generate password hash (for setup)
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
