const fs = require('fs');
const path = require('path');

// Read Hubbardton specs to get product counts per collection
const specsPath = path.join(__dirname, '..', 'data', 'hubbardtonspecs.json');
const specs = JSON.parse(fs.readFileSync(specsPath, 'utf-8'));

// Count products per collection
const collectionCounts = {};
Object.values(specs).forEach(product => {
  const family = product.Family?.trim();
  if (family) {
    collectionCounts[family] = (collectionCounts[family] || 0) + 1;
  }
});

console.log('Product counts by collection:');
Object.entries(collectionCounts)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([name, count]) => console.log(`  ${name}: ${count} products`));

// Read and update promotions
const promotionsPath = path.join(__dirname, '..', 'data', 'promotions.json');
const promotions = JSON.parse(fs.readFileSync(promotionsPath, 'utf-8'));

// Find Hubbardton Forge promotion
const hfPromo = promotions.find(p => p.vendor === 'hubbardton-forge');

if (!hfPromo) {
  console.error('\nHubbardton Forge promotion not found!');
  process.exit(1);
}

// Update product counts in presentation items
if (hfPromo.presentationItems) {
  hfPromo.presentationItems.forEach(item => {
    if (item.type === 'collection' && item.collectionData) {
      const collectionName = item.collectionData.collectionName;
      const productCount = collectionCounts[collectionName] || 0;
      item.collectionData.productCount = productCount;
    }
  });
}

// Update product counts in presentations
if (hfPromo.presentations) {
  hfPromo.presentations.forEach(presentation => {
    if (presentation.presentationItems) {
      presentation.presentationItems.forEach(item => {
        if (item.type === 'collection' && item.collectionData) {
          const collectionName = item.collectionData.collectionName;
          const productCount = collectionCounts[collectionName] || 0;
          item.collectionData.productCount = productCount;
        }
      });
    }
  });
}

// Update timestamp
hfPromo.updatedAt = new Date().toISOString();

// Write back to file
fs.writeFileSync(promotionsPath, JSON.stringify(promotions, null, 2));

console.log('\n✓ Updated Hubbardton Forge product counts in promotions.json');
