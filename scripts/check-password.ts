import bcrypt from 'bcryptjs';

const hash = '$2b$10$hdxGrHZufyKwsreFES9X8uYhpd2U.8E1jQ5OhK..qQWzLFDcPZrVK';

const passwords = [
  'password',
  'rep',
  'rep123',
  'admin',
  'admin123',
  '123456',
  'demo',
  'test',
  'curated',
  'presentation',
  'libco',
  'lib',
  'lib123',
  'default',
  'welcome',
  '1234',
  'pass',
  'pass123',
];

async function checkPasswords() {
  console.log('Checking passwords against hash...\n');

  for (const password of passwords) {
    const isMatch = await bcrypt.compare(password, hash);
    if (isMatch) {
      console.log(`✅ MATCH FOUND! Password is: "${password}"`);
      return;
    }
  }

  console.log('❌ No match found in common passwords list');
  console.log('\nYou can manually test a password by running:');
  console.log('node -e "const bcrypt = require(\'bcryptjs\'); bcrypt.compare(\'YOUR_PASSWORD\', \'$2b$10$hdxGrHZufyKwsreFES9X8uYhpd2U.8E1jQ5OhK..qQWzLFDcPZrVK\').then(r => console.log(r));"');
}

checkPasswords();
