import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type - only images for audit photos
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.' },
        { status: 400 }
      );
    }

    // Create uploads directory with customer subfolder
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'audits', customerId || 'general');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, '_');
    const filename = `${timestamp}-${sanitizedName}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/audits/${customerId || 'general'}/${filename}`;

    return NextResponse.json({
      url,
      filename,
      capturedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit photo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
