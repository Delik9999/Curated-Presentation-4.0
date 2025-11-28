const specs = require('../data/hubbardtonspecs.json');

const collections = [...new Set(
  Object.values(specs).map(p => p['Theme'] || p['Family'] || p['Collection'] || 'Uncategorized')
)].filter(c => c && c != 'Uncategorized').sort();

console.log('Total unique collections:', collections.length);
console.log('\nAll collections:');
collections.forEach(c => console.log('  -', c));

// Get product count per collection
console.log('\n\nProduct counts per collection:');
const collectionCounts = {};
Object.values(specs).forEach(p => {
  const coll = p['Theme'] || p['Family'] || p['Collection'] || 'Uncategorized';
  if (coll && coll != 'Uncategorized') {
    collectionCounts[coll] = (collectionCounts[coll] || 0) + 1;
  }
});

Object.entries(collectionCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([coll, count]) => console.log(`  ${coll}: ${count} products`));
