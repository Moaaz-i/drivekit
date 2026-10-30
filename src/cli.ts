import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { DriveKit } from './core/client.js';
import { formatBytes } from './utils/format.js';
import { DriveKitAuthConfig } from './types.js';

const program = new Command();

program
  .name('drivekit')
  .description(chalk.bold.cyan('⚡ DriveKit CLI: High-speed, flexible Google Drive tool for developers'))
  .version('1.0.0')
  .option('-k, --key <path>', 'Path to service account JSON key file')
  .option('-t, --token <token>', 'Google OAuth2 Bearer access token');

function getAuthConfig(cmdOptions: any): DriveKitAuthConfig {
  const keyFilePath = cmdOptions.key || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GDRIVE_SERVICE_ACCOUNT_PATH;
  const accessToken = cmdOptions.token || process.env.GDRIVE_ACCESS_TOKEN;

  return {
    keyFilePath,
    accessToken,
  };
}

async function getClient(cmdOptions: any) {
  const globalOpts = program.opts();
  const mergedOpts = { ...globalOpts, ...cmdOptions };
  const auth = getAuthConfig(mergedOpts);
  const client = new DriveKit({ auth });
  await client.init();
  return client;
}

// Command: quota
program
  .command('quota')
  .description('Show Google Drive storage usage & quota')
  .action(async (options) => {
    const spinner = ora('Fetching storage quota...').start();
    try {
      const client = await getClient(options);
      const quota = await client.getStorageQuota();
      spinner.stop();

      console.log(chalk.bold.cyan('\n📊 Google Drive Storage Quota:'));
      if (quota.user?.displayName) {
        console.log(`👤 User:        ${chalk.yellow(quota.user.displayName)} (${quota.user.emailAddress})`);
      }
      console.log(`💾 Total Usage:  ${chalk.green(quota.formattedUsage)} / ${chalk.blue(quota.formattedLimit)}`);
      if (quota.percentUsed !== null) {
        console.log(`📈 Usage %:      ${chalk.bold(quota.percentUsed + '%')}`);
      }
      console.log(`📁 In Drive:     ${formatBytes(quota.usageInDrive)}`);
      console.log(`🗑️  In Trash:     ${formatBytes(quota.usageInDriveTrash)}\n`);
    } catch (err: any) {
      spinner.fail(chalk.red(`Failed to fetch quota: ${err.message}`));
      process.exit(1);
    }
  });

// Command: ls
program
  .command('ls [folder]')
  .description('List files and folders (by virtual path or folder ID, default: root)')
  .action(async (folder = '/', options) => {
    const spinner = ora(`Listing contents of ${folder}...`).start();
    try {
      const client = await getClient(options);
      const items = await client.ls(folder);
      spinner.stop();

      if (items.length === 0) {
        console.log(chalk.dim(`(Folder ${folder} is empty)`));
        return;
      }

      console.log(chalk.bold.cyan(`\n📁 Contents of "${folder}":\n`));
      for (const item of items) {
        const isDir = item.mimeType === 'application/vnd.google-apps.folder';
        const icon = isDir ? '📁' : '📄';
        const nameFormatted = isDir ? chalk.bold.blue(item.name) : chalk.white(item.name);
        const sizeFormatted = item.size ? chalk.dim(`[${formatBytes(parseInt(item.size, 10))}]`) : chalk.dim(isDir ? '[DIR]' : '[Google Doc]');
        const idFormatted = chalk.dim(`(ID: ${item.id})`);

        console.log(` ${icon}  ${nameFormatted.padEnd(40)} ${sizeFormatted.padEnd(16)} ${idFormatted}`);
      }
      console.log(`\nTotal items: ${chalk.green(items.length)}\n`);
    } catch (err: any) {
      spinner.fail(chalk.red(`Failed to list items: ${err.message}`));
      process.exit(1);
    }
  });

// Command: upload
program
  .command('upload <localFile> [remotePath]')
  .description('Upload a file with high speed and live progress tracking')
  .option('-o, --overwrite', 'Overwrite remote file if it exists')
  .action(async (localFile, remotePath = '/', options) => {
    if (!fs.existsSync(localFile)) {
      console.error(chalk.red(`❌ Local file not found: ${localFile}`));
      process.exit(1);
    }

    const fileName = path.basename(localFile);
    const spinner = ora(`Preparing upload: ${fileName}...`).start();

    try {
      const client = await getClient(options);
      spinner.stop();

      const startTime = Date.now();
      const res = await client.upload({
        source: localFile,
        name: fileName,
        parent: remotePath,
        overwrite: options.overwrite,
        onProgress: (p) => {
          process.stdout.write(
            `\r🚀 Uploading: ${chalk.cyan(p.percentage + '%')} | Speed: ${chalk.green(p.speedFormatted)} | ETA: ${chalk.yellow(p.estimatedTimeRemainingSeconds + 's')} [${formatBytes(p.bytesSent)} / ${formatBytes(p.totalBytes)}]`
          );
        },
      });

      process.stdout.write('\n');
      const durationSecs = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.green(`\n✅ Upload completed successfully in ${durationSecs}s!`));
      console.log(`📄 Name:     ${chalk.bold(res.name)}`);
      console.log(`🆔 ID:       ${chalk.cyan(res.id)}`);
      if (res.webViewLink) {
        console.log(`🔗 Link:     ${chalk.underline(res.webViewLink)}`);
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red(`Upload failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: download
program
  .command('download <fileIdOrPath> [destination]')
  .description('Download a file from Google Drive')
  .action(async (fileIdOrPath, destination = '.', options) => {
    const spinner = ora(`Fetching file ${fileIdOrPath}...`).start();
    try {
      const client = await getClient(options);
      spinner.stop();

      const res = await client.download(fileIdOrPath, {
        destination,
        onProgress: (p) => {
          const pct = p.percentage !== undefined ? `${p.percentage}%` : `${formatBytes(p.bytesRead)}`;
          process.stdout.write(
            `\r⬇️  Downloading: ${chalk.cyan(pct)} | Speed: ${chalk.green(p.speedFormatted)}`
          );
        },
      });

      process.stdout.write('\n');
      console.log(chalk.green(`\n✅ Download completed!`));
      console.log(`📂 Saved to: ${chalk.bold(res.filePath)}`);
      if (res.size) {
        console.log(`📦 Size:     ${formatBytes(res.size)}`);
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red(`Download failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: share
program
  .command('share <fileIdOrPath> [email]')
  .description('Share file publicly or with a specific email')
  .action(async (fileIdOrPath, email, options) => {
    const spinner = ora(`Updating permissions for ${fileIdOrPath}...`).start();
    try {
      const client = await getClient(options);
      if (email) {
        await client.share(fileIdOrPath, {
          role: 'reader',
          type: 'user',
          emailAddress: email,
        });
        spinner.succeed(chalk.green(`File shared with ${email} as reader!`));
      } else {
        const links = await client.sharePublic(fileIdOrPath);
        spinner.succeed(chalk.green(`File is now publicly accessible to anyone with the link!`));
        console.log(`🔗 Preview Link:         ${chalk.underline(links.previewLink)}`);
        console.log(`📥 Direct Download Link: ${chalk.underline(links.directDownloadLink)}\n`);
      }
    } catch (err: any) {
      spinner.fail(chalk.red(`Sharing failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: delete
program
  .command('delete <fileIdOrPath>')
  .description('Move a file/folder to trash, or delete permanently with --permanent')
  .option('-p, --permanent', 'Permanently delete instead of moving to trash')
  .action(async (fileIdOrPath, options) => {
    const actionName = options.permanent ? 'Permanently deleting' : 'Moving to trash';
    const spinner = ora(`${actionName} ${fileIdOrPath}...`).start();
    try {
      const client = await getClient(options);
      await client.delete(fileIdOrPath, options.permanent);
      spinner.succeed(chalk.green(`Success! ${fileIdOrPath} has been ${options.permanent ? 'permanently deleted' : 'moved to trash'}.`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: sync
program
  .command('sync <localDir> <remoteFolder>')
  .description('Sync a local directory to Google Drive recursively with high concurrency')
  .option('-c, --concurrency <number>', 'Number of parallel uploads', '4')
  .option('-o, --overwrite', 'Overwrite files if they already exist')
  .action(async (localDir, remoteFolder, options) => {
    if (!fs.existsSync(localDir)) {
      console.error(chalk.red(`❌ Local directory not found: ${localDir}`));
      process.exit(1);
    }

    const concurrency = parseInt(options.concurrency, 10) || 4;
    console.log(chalk.bold.cyan(`\n⚡ Starting recursive sync:`));
    console.log(`📂 Local:       ${localDir}`);
    console.log(`☁️  Remote:      ${remoteFolder}`);
    console.log(`🚀 Concurrency: ${concurrency} parallel streams\n`);

    const spinner = ora('Scanning and synchronizing...').start();

    try {
      const client = await getClient(options);
      spinner.stop();

      const result = await client.syncFolder(localDir, remoteFolder, {
        concurrency,
        overwrite: options.overwrite,
        onFileStart: (_, rel) => {
          console.log(`  ⬆️  Uploading: ${chalk.dim(rel)}`);
        },
        onFileComplete: (_, fileId) => {
          console.log(`     ${chalk.green('✓ Completed')} ${chalk.dim(`(ID: ${fileId})`)}`);
        },
      });

      console.log(chalk.bold.green(`\n🎉 Sync Finished in ${(result.durationMs / 1000).toFixed(1)}s!`));
      console.log(`✅ Uploaded: ${chalk.green(result.uploaded.length)} files (${formatBytes(result.totalBytes)})`);
      if (result.failed.length > 0) {
        console.log(`❌ Failed:   ${chalk.red(result.failed.length)} files`);
        for (const f of result.failed) {
          console.log(`   - ${f.localPath}: ${chalk.red(f.error.message)}`);
        }
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red(`Sync failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: pull
program
  .command('pull <remoteFolder> <localDir>')
  .description('Download an entire remote Google Drive folder down to local directory with MD5 deduplication')
  .option('-c, --concurrency <number>', 'Parallel downloads', '4')
  .option('-o, --overwrite', 'Overwrite local files even if identical')
  .action(async (remoteFolder, localDir, options) => {
    const concurrency = parseInt(options.concurrency, 10) || 4;
    console.log(chalk.bold.cyan(`\n⬇️  Starting smart pull:`));
    console.log(`☁️  Remote:      ${remoteFolder}`);
    console.log(`📂 Local:       ${localDir}`);
    console.log(`🚀 Concurrency: ${concurrency} parallel streams\n`);

    const spinner = ora('Scanning remote files...').start();
    try {
      const client = await getClient(options);
      spinner.stop();

      const result = await client.pull(remoteFolder, localDir, {
        concurrency,
        overwrite: options.overwrite,
        onFileStart: (name, rel) => {
          console.log(`  ⬇️  Downloading: ${chalk.dim(rel)}`);
        },
        onFileComplete: (name) => {
          console.log(`     ${chalk.green('✓ Saved')} ${name}`);
        },
      });

      console.log(chalk.bold.green(`\n🎉 Pull Finished in ${(result.durationMs / 1000).toFixed(1)}s!`));
      console.log(`✅ Downloaded: ${chalk.green(result.downloaded.length)} files (${formatBytes(result.totalBytes)})`);
      if (result.skipped.length > 0) {
        console.log(`⏭️  Skipped:    ${chalk.yellow(result.skipped.length)} identical files`);
      }
      if (result.failed.length > 0) {
        console.log(`❌ Failed:     ${chalk.red(result.failed.length)} files`);
      }
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red(`Pull failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: clean
program
  .command('clean')
  .description('Storage management: find largest files, detect duplicates, or empty trash')
  .option('-l, --largest [count]', 'Show the largest space-consuming files', '10')
  .option('-d, --duplicates', 'Find duplicate files')
  .option('--empty-trash', 'Empty entire Google Drive trash bin')
  .action(async (options) => {
    try {
      const client = await getClient(options);

      if (options.emptyTrash) {
        const spinner = ora('Emptying trash bin...').start();
        await client.emptyTrash();
        spinner.succeed(chalk.green('Trash bin emptied successfully!'));
        return;
      }

      if (options.duplicates) {
        const spinner = ora('Scanning for duplicate files...').start();
        const duplicates = await client.findDuplicates({ by: 'name' });
        spinner.stop();

        if (duplicates.length === 0) {
          console.log(chalk.green('\n✨ No duplicate files found!'));
          return;
        }

        console.log(chalk.bold.yellow(`\n⚠️  Found ${duplicates.length} duplicate groups:\n`));
        for (const g of duplicates) {
          console.log(`📄 "${chalk.bold(g.name)}" (${chalk.cyan(g.count + ' copies')} - total: ${chalk.magenta(g.formattedTotalSize)})`);
          for (const f of g.files) {
            console.log(`   - ID: ${chalk.dim(f.id)} [${formatBytes(f.size)}] modified: ${chalk.dim(f.modifiedTime || 'unknown')}`);
          }
        }
        console.log('');
        return;
      }

      // Default: Largest files
      const limit = parseInt(options.largest, 10) || 10;
      const spinner = ora(`Finding top ${limit} largest files...`).start();
      const largest = await client.findLargestFiles(limit);
      spinner.stop();

      console.log(chalk.bold.cyan(`\n📊 Top ${largest.length} Largest Files in Drive:\n`));
      for (let i = 0; i < largest.length; i++) {
        const f = largest[i];
        console.log(` ${chalk.bold((i + 1) + '.')} ${chalk.white(f.name.padEnd(35))} ${chalk.green(f.formattedSize.padEnd(12))} ID: ${chalk.dim(f.id)}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(chalk.red(`Clean operation failed: ${err.message}`));
      process.exit(1);
    }
  });

// Command: watch
program
  .command('watch [folder]')
  .description('Watch Google Drive or a specific folder for real-time changes')
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '5000')
  .action(async (folder = '/', options) => {
    const intervalMs = parseInt(options.interval, 10) || 5000;
    console.log(chalk.bold.cyan(`\n👀 Watching for changes in "${folder}" (polling every ${intervalMs / 1000}s)...`));
    console.log(chalk.dim('Press Ctrl+C to stop watching.\n'));

    try {
      const client = await getClient(options);
      const watcher = await client.watch(folder === '/' ? undefined : folder, { intervalMs });

      watcher.on('create', (e) => {
        console.log(`${chalk.green('[CREATED]')}  ${chalk.bold(e.file?.name || e.fileId)} ${chalk.dim(`(ID: ${e.fileId})`)}`);
      });

      watcher.on('modify', (e) => {
        console.log(`${chalk.yellow('[MODIFIED]')} ${chalk.bold(e.file?.name || e.fileId)} ${chalk.dim(`(ID: ${e.fileId})`)}`);
      });

      watcher.on('delete', (e) => {
        console.log(`${chalk.red('[DELETED]')}  ${chalk.bold(e.file?.name || e.fileId)} ${chalk.dim(`(ID: ${e.fileId})`)}`);
      });

      watcher.on('error', (err) => {
        console.error(chalk.red(`[WATCHER ERROR] ${err.message}`));
      });

      process.on('SIGINT', () => {
        watcher.stop();
        console.log(chalk.yellow('\nWatcher stopped. Goodbye!'));
        process.exit(0);
      });
    } catch (err: any) {
      console.error(chalk.red(`Failed to start watcher: ${err.message}`));
      process.exit(1);
    }
  });

// Command: login
program
  .command('login')
  .description('Interactive 1-click browser OAuth2 sign-in')
  .requiredOption('--client-id <id>', 'Google OAuth2 Client ID')
  .requiredOption('--client-secret <secret>', 'Google OAuth2 Client Secret')
  .option('-p, --port <port>', 'Local callback port', '3000')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n⚡ DriveKit Interactive Login'));
    console.log('Opening your browser for one-click Google OAuth sign-in...\n');

    try {
      const { DriveKit } = await import('./core/client.js');
      const result = await DriveKit.loginWithBrowser({
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        port: parseInt(options.port, 10) || 3000,
      });

      console.log(chalk.bold.green('\n🎉 Login successful!'));
      console.log(`Access Token:  ${chalk.cyan(result.tokens.access_token?.slice(0, 25) + '...')}`);
      if (result.tokens.refresh_token) {
        console.log(`Refresh Token: ${chalk.green(result.tokens.refresh_token?.slice(0, 25) + '...')}`);
      }

      // Save tokens to credentials.json in current directory
      const outPath = path.resolve('./gdrive-tokens.json');
      fs.writeFileSync(outPath, JSON.stringify(result.tokens, null, 2), 'utf8');
      console.log(`💾 Saved tokens to: ${chalk.bold(outPath)}\n`);
    } catch (err: any) {
      console.error(chalk.red(`Login failed: ${err.message}`));
      process.exit(1);
    }
  });

export function runCLI() {
  program.parse(process.argv);
}

if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  runCLI();
}

