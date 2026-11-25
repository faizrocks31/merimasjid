const { execSync } = require('child_process');

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test",
  PRISMA_CLI_FORCE_NO_TTY: "true",
  CI: "true"
};

try {
  console.log('Running prisma migrate reset --force on test database...');
  const output = execSync('npx prisma migrate reset --force', {
    cwd: 'C:\\Users\\hp\\Documents\\Claude Project\\Masjid Collection',
    encoding: 'utf8',
    timeout: 300000,
    env
  });
  console.log(output);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stdout:', e.stdout);
  console.error('Stderr:', e.stderr);
}