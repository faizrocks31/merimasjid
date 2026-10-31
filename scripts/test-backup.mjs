// Test backup script with explicit env loading
import 'dotenv/config';

const url = process.env.TEST_DATABASE_URL;
console.log("TEST_DATABASE_URL raw:", JSON.stringify(url));
console.log("TEST_DATABASE_URL length:", url?.length);

if (!url) {
  console.error("TEST_DATABASE_URL not set");
  process.exit(1);
}

const parsed = new URL(url);
console.log("Parsed:", {
  protocol: parsed.protocol,
  hostname: parsed.hostname,
  port: parsed.port,
  username: parsed.username,
  password: parsed.password,
  pathname: parsed.pathname,
  hash: parsed.hash,
  search: parsed.search
});

console.log("\nTrying manual parse:");
const regex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
const match = url.match(regex);
if (match) {
  console.log("Regex match:", {
    username: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  });
}