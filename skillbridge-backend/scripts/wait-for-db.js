const { execSync } = require('child_process');

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;

console.log('Waiting for Postgres to be ready...');

for (let i = 1; i <= MAX_RETRIES; i++) {
  try {
    execSync('docker compose exec -T postgres pg_isready -U postgres -d skillbridge', { stdio: 'ignore' });
    console.log('Postgres is ready!');
    process.exit(0);
  } catch {
    console.log(`  Attempt ${i}/${MAX_RETRIES} — not ready yet, retrying in ${RETRY_DELAY / 1000}s...`);
    require('timers/promises').setTimeout(RETRY_DELAY);
  }
}

console.error('Postgres did not become ready in time.');
process.exit(1);
