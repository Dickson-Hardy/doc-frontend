import fs from 'node:fs';
import path from 'node:path';
import { list } from '@vercel/blob';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim().replace(/^export\s+/, '');
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnvFromFrontendRoot(frontendRoot) {
  const files = ['.env', '.env.production', '.env.local'];
  const loaded = {};

  for (const name of files) {
    const fullPath = path.join(frontendRoot, name);
    Object.assign(loaded, parseEnvFile(fullPath));
  }

  return loaded;
}

function getArgValue(flagName) {
  const args = process.argv.slice(2);
  const found = args.find((arg) => arg.startsWith(`${flagName}=`));
  if (!found) return undefined;
  return found.slice(flagName.length + 1);
}

async function main() {
  const frontendRoot = process.cwd();
  const envFromFiles = loadEnvFromFrontendRoot(frontendRoot);

  const token =
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VITE_BLOB_READ_WRITE_TOKEN ||
    envFromFiles.BLOB_READ_WRITE_TOKEN ||
    envFromFiles.VITE_BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.error('Missing token. Set BLOB_READ_WRITE_TOKEN or VITE_BLOB_READ_WRITE_TOKEN in env.');
    process.exit(1);
  }

  const prefix = getArgValue('--prefix') || 'abstracts/';
  const showUrls = process.argv.includes('--show-urls');

  let cursor = undefined;
  let allBlobs = [];

  do {
    const result = await list({
      token,
      prefix,
      cursor,
      limit: 1000,
    });

    allBlobs = allBlobs.concat(result.blobs || []);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const totalUploads = allBlobs.length;
  const totalSizeBytes = allBlobs.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  // With the current filename scheme, each blob is one upload; one person may upload more than once.
  console.log(`Prefix: ${prefix}`);
  console.log(`Total uploaded files: ${totalUploads}`);
  console.log(`Estimated persons uploaded (assuming 1 file per person): ${totalUploads}`);
  console.log(`Total storage used: ${totalSizeMB} MB`);

  if (showUrls) {
    console.log('\nFiles:');
    for (const blob of allBlobs) {
      console.log(`- ${blob.pathname} (${blob.size || 0} bytes)`);
    }
  }
}

main().catch((error) => {
  console.error('Failed to check Vercel Blob uploads:', error?.message || error);
  process.exit(1);
});
