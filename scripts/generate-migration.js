const { execSync } = require('child_process');

try {
  const output = execSync('npx prisma migrate dev --name phase2a_collection_architecture --create-only', {
    cwd: 'C:\\Users\\hp\\Documents\\Claude Project\\Masjid Collection',
    encoding: 'utf8',
    timeout: 180000
  });
  console.log(output);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stdout:', e.stdout);
  console.error('Stderr:', e.stderr);
}