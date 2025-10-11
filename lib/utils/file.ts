import { promises as fs } from 'fs';
import path from 'path';

export async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  const fullPath = path.join(process.cwd(), relativePath);
  try {
    const file = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(file) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(relativePath, fallback);
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const fullPath = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const tempPath = `${fullPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, fullPath);
}
