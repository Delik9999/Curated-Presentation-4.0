const fs = require('fs');
const path = require('path');

// Read the promotions file
const promotionsPath = path.join(__dirname, '..', 'data', 'promotions.json');
const promotions = JSON.parse(fs.readFileSync(promotionsPath, 'utf-8'));

// Find the Hubbardton Forge promotion
const hfPromo = promotions.find(p => p.vendor === 'hubbardton-forge');

if (!hfPromo) {
  console.error('Hubbardton Forge promotion not found!');
  process.exit(1);
}

// Define all the collections from the actual data
const allCollections = [
  'Henry',
  'Shield',
  'Snaps',
  'Spire',
  'Union',
  'Crux',
  'Coral',
  'Aspen',
  'Cairn',
  'Horizon',
  'Sway',
  'Lattice',
  'Fracture',
  'Gatsby'
];

// Update the collections array with all collections, all years included
hfPromo.collections = allCollections.map(collectionName => ({
  collectionName,
  years: [2025],
  includeAllYears: true
}));

// Create presentation items for each collection
hfPromo.presentationItems = allCollections.map((collectionName, index) => {
  const specs = require('../data/hubbardtonspecs.json');
  const collectionProducts = Object.values(specs).filter(p => p.Theme === collectionName);

  return {
    id: `${collectionName}-${Date.now() + index}`,
    type: 'collection',
    order: index,
    collectionData: {
      collectionName,
      productCount: collectionProducts.length,
      vendor: 'hubbardton-forge',
      includeAllYears: true,
      years: [2025]
    },
    properties: {
      startExpanded: false,
      showProductCount: true,
      badges: []
    }
  };
});

// Update the active presentation with the same items
if (hfPromo.presentations && hfPromo.presentations.length > 0) {
  const activePresentation = hfPromo.presentations.find(p => p.isActive);
  if (activePresentation) {
    activePresentation.collections = hfPromo.collections;
    activePresentation.presentationItems = hfPromo.presentationItems;
    activePresentation.updatedAt = new Date().toISOString();
  }
}

// Update the main promotion timestamp
hfPromo.updatedAt = new Date().toISOString();

// Write back to file
fs.writeFileSync(promotionsPath, JSON.stringify(promotions, null, 2));

console.log('✓ Updated Hubbardton Forge promotion with', allCollections.length, 'collections');
console.log('\nCollections added:');
allCollections.forEach(c => console.log('  -', c));
