/**
 * Quickstart Example for DriveKit
 * Run: npx tsx examples/quickstart.ts
 */
import { createDrive } from '../src/index.js';

async function main() {
  console.log('⚡ Initializing DriveKit...');

  // 1. Initialize DriveKit
  // It automatically looks for GOOGLE_APPLICATION_CREDENTIALS or you can pass keyFilePath / tokens
  const drive = await createDrive({
    auth: {
      keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
    },
    // Optional root folder ID or custom chunk size
    uploadChunkSize: 8 * 1024 * 1024, // 8MB
  });

  // 2. Check storage quota
  const quota = await drive.getStorageQuota();
  console.log(`📊 Storage Quota: ${quota.formattedUsage} / ${quota.formattedLimit}`);

  // 3. Ensure a virtual directory path exists (like mkdir -p)
  console.log('📁 Creating virtual directory...');
  const folderId = await drive.mkdirp('/Backups/2026/October');
  console.log(`Directory ready with ID: ${folderId}`);

  // 4. Upload a file with live progress tracking
  console.log('🚀 Uploading sample file...');
  const uploaded = await drive.upload({
    source: Buffer.from('Hello Google Drive from DriveKit!'),
    name: 'drivekit-demo.txt',
    parent: '/Backups/2026/October', // can be path or folder ID
    overwrite: true,
    onProgress: (p) => {
      console.log(`Progress: ${p.percentage}% | Speed: ${p.speedFormatted} | Chunk: ${p.chunkIndex}/${p.totalChunks}`);
    },
  });
  console.log(`✅ Uploaded file ID: ${uploaded.id}`);

  // 5. Query files with fluent builder
  console.log('🔍 Querying files...');
  const files = await drive.query()
    .nameContains('demo')
    .notTrashed()
    .orderBy('modifiedTime desc')
    .pageSize(10)
    .list();

  console.log(`Found ${files.length} matching files:`);
  for (const f of files) {
    console.log(`- ${f.name} (${f.id})`);
  }

  // 6. Share file publicly
  if (uploaded.id) {
    const links = await drive.sharePublic(uploaded.id);
    console.log(`🔗 Public Preview Link: ${links.previewLink}`);
    console.log(`📥 Direct Download Link: ${links.directDownloadLink}`);
  }
}

// Uncomment to run if credentials are ready:
// main().catch(console.error);
console.log('💡 Quickstart file created! Configure credentials and execute when ready.');

