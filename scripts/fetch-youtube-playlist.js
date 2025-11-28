const fs = require('fs');
const { execSync } = require('child_process');

// Multiple playlists to fetch
const playlists = [
  'PLErSXx5ihJzWe_O_yawwRL_qgt39aNOaW', // First Savoy House playlist
  'PLErSXx5ihJzVdlL2iBk5EXG4gpaR_WLPT', // Second playlist
  'PLErSXx5ihJzWMB7ORrzJBmFraezucEhYh', // Third playlist
];

const allVideoMap = {};

// Process each playlist
for (const playlistId of playlists) {
  console.log(`\nProcessing playlist: ${playlistId}`);
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  const html = execSync(`curl -s "${playlistUrl}"`).toString();

  // Save to temp file for debugging
  fs.writeFileSync('/tmp/playlist.html', html);

  // Extract video data using regex
  const videoIdMatches = [...html.matchAll(/"videoId":"([^"]+)"/g)];
  const titleMatches = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"/g)];

  // Get unique video IDs in order
  const videoIds = [];
  const seen = new Set();
  for (const match of videoIdMatches) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      videoIds.push(id);
    }
  }

  // Extract titles - look for both "Savoy House" and "Lib & Co" videos
  const titles = titleMatches
    .map(m => m[1])
    .filter(title => title.startsWith('Savoy House') || title.startsWith('Lib & Co'));

  // Create mapping
  let videosAdded = 0;
  for (let i = 0; i < Math.min(videoIds.length, titles.length); i++) {
    const title = titles[i];
    const videoId = videoIds[i];

    let collectionName = null;

    // Try to match Savoy House pattern
    let collectionMatch = title.match(/Savoy House ([A-Za-z\s]+?)(?:\d|-|in |LED|Chandelier|Pendant|Fan)/);
    if (collectionMatch) {
      collectionName = collectionMatch[1].trim();
    } else {
      // Try to match Lib & Co pattern
      collectionMatch = title.match(/Lib & Co ([A-Za-z\s]+?)(?:\d|-|in |LED|Chandelier|Pendant|Fan|Sconce|Flush)/);
      if (collectionMatch) {
        collectionName = collectionMatch[1].trim();
      }
    }

    if (collectionName) {
      // Convert to slug format (e.g., "Del Mar" -> "del-mar-collection")
      const slug = collectionName.toLowerCase().replace(/\s+/g, '-') + '-collection';

      // Only add if not already in the map (first occurrence wins)
      if (!allVideoMap[slug]) {
        allVideoMap[slug] = `youtube:${videoId}`;
        console.log(`  ${slug}: youtube:${videoId} (${title})`);
        videosAdded++;
      }
    }
  }

  console.log(`  → Added ${videosAdded} videos from this playlist`);
}

// Read existing collection videos
const existingVideos = JSON.parse(fs.readFileSync('data/collection-videos.json', 'utf-8'));

// Merge with existing, YouTube overrides
const mergedVideos = { ...existingVideos, ...allVideoMap };

// Write back
fs.writeFileSync(
  'data/collection-videos.json',
  JSON.stringify(mergedVideos, null, 2)
);

console.log(`\n✓ Updated collection-videos.json with ${Object.keys(allVideoMap).length} total YouTube videos`);
console.log(`✓ Total collections with videos: ${Object.keys(mergedVideos).length}`);
