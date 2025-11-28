import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const COLLECTION_VIDEOS_PATH = path.join(process.cwd(), 'data', 'collection-videos.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(COLLECTION_VIDEOS_PATH, 'utf-8');
    const videos = JSON.parse(fileContent);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error loading collection videos:', error);
    return NextResponse.json({ videos: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collectionSlug, videoUrl } = body;

    if (!collectionSlug || !videoUrl) {
      return NextResponse.json(
        { error: 'Missing collectionSlug or videoUrl' },
        { status: 400 }
      );
    }

    // Read existing videos
    const fileContent = await fs.readFile(COLLECTION_VIDEOS_PATH, 'utf-8');
    const videos = JSON.parse(fileContent);

    // Update or add the video
    videos[collectionSlug] = videoUrl;

    // Write back to file
    await fs.writeFile(COLLECTION_VIDEOS_PATH, JSON.stringify(videos, null, 2), 'utf-8');

    return NextResponse.json({ success: true, collectionSlug, videoUrl });
  } catch (error) {
    console.error('Error saving collection video:', error);
    return NextResponse.json(
      { error: 'Failed to save collection video' },
      { status: 500 }
    );
  }
}
