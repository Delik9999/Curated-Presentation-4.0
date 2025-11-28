/**
 * Scrape collection video URLs from libandco.com
 *
 * This script fetches collection pages and extracts video URLs
 * Usage: node scripts/scrape-collection-videos.js
 */

const fs = require('fs');
const path = require('path');

// Base URL for LibandCo collections
const BASE_URL = 'https://libandco.com';

// Get unique collection names from libspec.json
const libspecPath = path.join(__dirname, '../data/libspec.json');
const libspec = JSON.parse(fs.readFileSync(libspecPath, 'utf-8'));

// Extract unique collection names
const collections = new Set();
libspec.forEach(item => {
  const collectionName = item.name.split(',')[0]?.trim();
  if (collectionName) {
    collections.add(collectionName);
  }
});

console.log(`Found ${collections.size} unique collections`);

// Convert collection name to URL slug
function collectionToSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Function to fetch and extract video URL from a collection page
async function fetchCollectionVideo(collectionName) {
  const slug = collectionToSlug(collectionName);
  const collectionUrl = `${BASE_URL}/collections/${slug}-collection`;

  try {
    console.log(`Fetching: ${collectionUrl}`);
    const response = await fetch(collectionUrl);

    if (!response.ok) {
      console.log(`  ❌ Not found (${response.status})`);
      return null;
    }

    const html = await response.text();

    // Look for video URL pattern: https://cdn.shopify.com/videos/c/o/v/{hash}.mp4
    const videoMatch = html.match(/https:\/\/cdn\.shopify\.com\/videos\/c\/o\/v\/([a-f0-9]+)\.mp4/);

    if (videoMatch) {
      const videoUrl = videoMatch[0];
      console.log(`  ✅ Found video: ${videoUrl}`);
      return videoUrl;
    }

    console.log(`  ⚠️  No video found in page`);
    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching ${collectionName}:`, error.message);
    return null;
  }
}

// Main function to scrape all collections
async function scrapeAllCollections() {
  const collectionVideos = {};
  const collectionsArray = Array.from(collections).sort();

  console.log('\nScraping collection videos...\n');

  for (const collectionName of collectionsArray) {
    const videoUrl = await fetchCollectionVideo(collectionName);
    if (videoUrl) {
      collectionVideos[collectionName] = videoUrl;
    }

    // Be nice to the server - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save to JSON file
  const outputPath = path.join(__dirname, '../data/collection-videos.json');
  fs.writeFileSync(outputPath, JSON.stringify(collectionVideos, null, 2));

  console.log(`\n✅ Saved ${Object.keys(collectionVideos).length} collection videos to ${outputPath}`);
  console.log(`   Total collections: ${collections.size}`);
  console.log(`   Found videos: ${Object.keys(collectionVideos).length}`);
  console.log(`   Missing videos: ${collections.size - Object.keys(collectionVideos).length}`);
}

// Run the scraper
scrapeAllCollections().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
