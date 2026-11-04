import readline from 'node:readline';
import chalk from 'chalk';
import type { DriveKit } from '../core/client.js';
import type { DriveApiFile } from '../types.js';
import { formatBytes } from '../utils/format.js';

/**
 * Creates an OSC 8 clickable hyperlink in supported modern terminals (macOS Terminal, iTerm2, VS Code, etc.)
 */
export function terminalLink(text: string, url: string): string {
  // OSC 8 ; params ; url ST text OSC 8 ;; ST
  return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}

/**
 * Renders a visually stunning, colored file table with clickable links
 */
export function renderFileRow(item: DriveApiFile, index?: number): string {
  const isDir = item.mimeType === 'application/vnd.google-apps.folder';
  const icon = isDir ? '📁' : getFileIcon(item.mimeType || '');
  const prefix = index !== undefined ? `${chalk.dim((index + 1).toString().padStart(2, ' ') + '.')} ` : '';

  let nameFormatted = isDir ? chalk.bold.blue(item.name || 'untitled') : chalk.white(item.name || 'untitled');
  if (item.webViewLink) {
    nameFormatted = terminalLink(nameFormatted, item.webViewLink);
  }

  const sizeFormatted = item.size
    ? chalk.dim(`[${formatBytes(parseInt(item.size, 10)).padStart(9, ' ')}]`)
    : chalk.dim(isDir ? '[  FOLDER  ]' : '[   DOC    ]');

  const idFormatted = chalk.dim(`ID: ${item.id}`);

  return `${prefix}${icon}  ${nameFormatted.padEnd(45)} ${sizeFormatted}  ${idFormatted}`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️ ';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) return '📦';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation')) return '📽️ ';
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return '⚙️ ';
  return '📄';
}

/**
 * Interactive Keyboard-driven Google Drive File Explorer (TUI)
 */
export async function runInteractiveExplorer(client: DriveKit, initialFolder = '/'): Promise<void> {
  let currentFolder = initialFolder;
  let items: DriveApiFile[] = [];
  let selectedIndex = 0;
  let history: string[] = [];

  const refreshItems = async () => {
    items = await client.ls(currentFolder);
    selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  };

  await refreshItems();

  if (!process.stdin.isTTY) {
    console.log(chalk.yellow('Interactive explorer requires a TTY terminal. Listing items instead:'));
    for (const item of items) {
      console.log(renderFileRow(item));
    }
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  const renderScreen = () => {
    console.clear();
    console.log(chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.yellow(' ⚡ DriveKit Interactive Terminal Explorer                                       ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╠═══════════════════════════════════════════════════════════════════════════════════╣'));
    console.log(chalk.bold.cyan('║') + ` 📂 Path: ${chalk.bold.green(currentFolder.padEnd(72))} ` + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════════════════════════╝'));
    console.log(chalk.dim(' [↑/↓] Navigate  •  [Enter] Open Folder  •  [B] Back  •  [S] Share  •  [Q] Exit\n'));

    if (items.length === 0) {
      console.log(chalk.dim('   (This folder is empty)\n'));
      return;
    }

    const pageSize = 12;
    const startIdx = Math.max(0, Math.min(selectedIndex - Math.floor(pageSize / 2), items.length - pageSize));
    const endIdx = Math.min(items.length, startIdx + pageSize);

    for (let i = startIdx; i < endIdx; i++) {
      const isSelected = i === selectedIndex;
      const cursor = isSelected ? chalk.bold.cyan(' ► ') : '   ';
      const row = renderFileRow(items[i]);
      if (isSelected) {
        console.log(chalk.bgHex('#1e293b')(cursor + row));
      } else {
        console.log(cursor + row);
      }
    }

    console.log(chalk.dim(`\n Item ${selectedIndex + 1} of ${items.length}`));
  };

  renderScreen();

  return new Promise((resolve) => {
    const onKeypress = async (str: string, key: any) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'q' || (key.name === 'escape' && history.length === 0)) {
        cleanup();
        resolve();
        return;
      }

      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        renderScreen();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        renderScreen();
      } else if (key.name === 'return') {
        const item = items[selectedIndex];
        if (item && item.mimeType === 'application/vnd.google-apps.folder') {
          history.push(currentFolder);
          currentFolder = currentFolder === '/' ? `/${item.name}` : `${currentFolder}/${item.name}`;
          selectedIndex = 0;
          await refreshItems();
          renderScreen();
        } else if (item && item.webViewLink) {
          // Open link in browser
          const { exec } = await import('node:child_process');
          const openCmd = process.platform === 'darwin' ? `open "${item.webViewLink}"` : `xdg-open "${item.webViewLink}"`;
          exec(openCmd);
          renderScreen();
        }
      } else if (key.name === 'b' || key.name === 'backspace') {
        if (history.length > 0) {
          currentFolder = history.pop()!;
          selectedIndex = 0;
          await refreshItems();
          renderScreen();
        }
      } else if (str === 's' || str === 'S') {
        const item = items[selectedIndex];
        if (item && item.id) {
          process.stdin.pause();
          console.log(`\n\n${chalk.cyan('🔗 Getting shareable link for:')} ${chalk.bold(item.name)}...`);
          try {
            const links = await client.sharePublic(item.id);
            console.log(`Preview URL:         ${chalk.underline(links.previewLink)}`);
            console.log(`Direct Download URL: ${chalk.underline(links.directDownloadLink)}`);
            console.log(chalk.dim('\nPress any key to return to explorer...'));
            process.stdin.resume();
            process.stdin.once('data', () => {
              renderScreen();
            });
          } catch (err: any) {
            console.error(chalk.red(`Failed to share: ${err.message}`));
            setTimeout(renderScreen, 2000);
          }
        }
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      console.clear();
      console.log(chalk.green('👋 Exited DriveKit explorer.'));
    };

    process.stdin.on('keypress', onKeypress);
  });
}

