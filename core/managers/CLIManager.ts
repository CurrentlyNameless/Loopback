import * as readline from 'node:readline';
import chalk from 'chalk';
import { join } from 'path';
import { statSync, rmSync } from 'fs';
import { Client } from 'discord.js';
import { Logger } from '../utils/logger.ts';
import { ModuleManager } from './ModuleManager.ts';
import { ConfigManager } from './ConfigManager.ts';

export class CLIManager {
    private static rl: readline.Interface;

    static start(client: Client) {
        // Guard against event loop busy-polling on non-interactive / headless container stdin
        // (e.g. Pterodactyl, Docker, Wispbyte) where Bun / Node consumes 10-15% CPU polling non-TTY fd 0.
        if ((!process.stdin || !process.stdin.isTTY) && process.env.ENABLE_CLI !== 'true') {
            Logger.debug('Non-interactive terminal detected: CLI readline listener disabled to preserve CPU.', 'CLI');
            return;
        }

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        this.rl.on('line', (line) => {
            const input = line.trim();
            if (!input) return;

            const [command, ...args] = input.split(' ');
            this.handleCommand(command.toLowerCase(), args, client);
        });

        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.bold.magenta('⌨️  CONSOLE CLI')} ${chalk.gray('│')} ${chalk.white('Interactive shell ready.')} ${chalk.gray('Type ' + chalk.cyan('\'help\'') + ' for available commands.')}`);
    }

    private static async handleCommand(command: string, args: string[], client: Client) {
        switch (command) {
            case 'help':
                console.log('');
                console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
                console.log(` ${chalk.bold.magenta('⌨️  FLOOFCORE CONSOLE CLI COMMANDS')}`);
                console.log(chalk.gray('──────────────────────────────────────────────────────────────────────'));
                console.log(`  ${chalk.cyan('stop / exit')}       ${chalk.white('Safely shuts down the bot & flushes state')}`);
                console.log(`  ${chalk.cyan('stats')}             ${chalk.white('Displays live RAM, CPU, and server metrics')}`);
                console.log(`  ${chalk.cyan('reload <name>')}     ${chalk.white('Hot-reloads a specific module dynamically')}`);
                console.log(`  ${chalk.cyan('modules')}           ${chalk.white('Lists all registered modules & status')}`);
                console.log(`  ${chalk.cyan('backup [label]')}    ${chalk.white('Creates & uploads a zip backup to FLM server')}`);
                console.log(`  ${chalk.cyan('restore <url|id>')}  ${chalk.white('Restores bot state from a backup URL or ID')}`);
                console.log(`  ${chalk.cyan('install')}           ${chalk.white('Installs missing node dependencies (bun install)')}`);
                console.log(`  ${chalk.cyan('help')}              ${chalk.white('Displays this interactive command menu')}`);
                console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
                console.log('');
                break;

            case 'stop':
            case 'exit':
                Logger.info("Shutting down bot via CLI...", "System");
                await client.destroy();
                process.exit(0);
                break;

            case 'stats':
                const uptime = process.uptime();
                const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                console.log(`\n--- Bot Stats ---`);
                console.log(`Uptime: ${Math.floor(uptime)}s`);
                console.log(`Memory: ${memory} MB`);
                console.log(`Servers: ${client.guilds.cache.size}\n`);
                break;

            case 'modules':
                const mods = ModuleManager.getAllModules();
                console.log(`\n--- Loaded Modules (${mods.length}) ---`);
                mods.forEach(m => console.log(`- ${m.name} (${m.version})`));
                console.log('');
                break;

            case 'reload':
                if (args.length === 0) {
                    Logger.warn("Usage: reload <module_name>", "CLI");
                    return;
                }
                const moduleName = args.join(' ');
                Logger.info(`Attempting to reload module: ${moduleName}`, "CLI");
                Logger.warn("Dynamic reloading is currently being finalized in ModuleManager.", "CLI");
                break;

            case 'backup':
                await this.handleBackup(args);
                break;

            case 'restore':
                await this.handleRestore(args);
                break;

            case 'install':
            case 'bun':
            case 'npm':
                Logger.info('Running package manager install (bun install)...', 'CLI');
                try {
                    const { execSync } = require('node:child_process');
                    const isBun = typeof (process.versions as any)?.bun === 'string';
                    const cmd = isBun ? 'bun install' : 'npm install';
                    execSync(cmd, { cwd: process.cwd(), stdio: 'inherit', timeout: 180000 });
                    Logger.success('Dependencies installed successfully! Restart bot to apply all changes.', 'CLI');
                } catch (err: any) {
                    Logger.error(`Install failed: ${err.message}`, 'CLI');
                }
                break;

            default:
                Logger.warn(`Unknown CLI command: ${command}. Type 'help' for options.`, "CLI");
                break;
        }
    }

    private static async handleRestore(args: string[]) {
        if (args.length === 0) {
            Logger.warn("Usage: restore <downloadUrl | backupId>", "CLI");
            console.log('  Provide the full download URL from the dashboard, or just the backup ID.');
            console.log('  A backup ID will be resolved to: https://flm.moonmallow.dev/api/backups/download/<id>\n');
            return;
        }

        const config = ConfigManager.get();
        const serverUrl = (global as any).licenseManager?.getActiveServerUrl?.() || config?.license?.server || 'http://localhost:2053';

        let downloadUrl = args[0];
        // If it doesn't look like a URL, treat it as a backup ID
        if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
            downloadUrl = `${serverUrl.replace(/\/+$/, '')}/api/backups/download/${downloadUrl}`;
            console.log(`Resolved to: ${downloadUrl}\n`);
        }
        console.log(`\n--- Restoring from backup ---`);
        console.log(`URL: ${downloadUrl}`);

        // 1. License check
        const licenseKey = config?.license?.key;

        if (licenseKey) {
            console.log('Checking license validity...');
            try {
                const validateRes = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/license/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: licenseKey }),
                });
                const validateData = await validateRes.json();
                if (!validateData.valid) {
                    Logger.error(`License check failed: ${validateData.error || 'License is not valid'}`, "CLI");
                    return;
                }
                console.log('License is valid.\n');
            } catch (e: any) {
                Logger.error(`Could not reach license server: ${e.message}`, "CLI");
                return;
            }
        } else {
            console.log('No license key configured — proceeding without validation.\n');
        }

        // 2. Proceed with restore
        try {
            const { BackupManager } = await import('../utils/BackupManager.ts');
            await BackupManager.restoreFromZip(downloadUrl);
            Logger.success('✅ Restore completed via CLI', "CLI");
            console.log('\nIt is recommended to restart the bot to ensure all files are picked up.\n');
        } catch (e: any) {
            Logger.error(`❌ Restore failed: ${e.message}`, "CLI");
        }
    }

    private static async handleBackup(args: string[]) {
        const config = ConfigManager.get();
        const licenseKey = config?.license?.key;
        const serverUrl = (global as any).licenseManager?.getActiveServerUrl?.() || config?.license?.server || 'http://localhost:2053';
        const label = args.join(' ') || `CLI backup ${new Date().toLocaleString()}`;

        console.log(`\n--- Creating backup ---`);

        // 1. License check
        if (!licenseKey) {
            Logger.error("No license key configured — cannot upload backup", "CLI");
            return;
        }
        try {
            const validateRes = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/license/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: licenseKey }),
            });
            const validateData = await validateRes.json();
            if (!validateData.valid) {
                Logger.error(`License check failed: ${validateData.error || 'License is not valid'}`, "CLI");
                return;
            }
            console.log('License is valid.\n');
        } catch (e: any) {
            Logger.error(`Could not reach license server: ${e.message}`, "CLI");
            return;
        }

        // 2. Create zip
        const zipPath = join(process.cwd(), 'backups', `cli-backup-${Date.now()}.zip`);
        try {
            const { BackupManager } = await import('../utils/BackupManager.ts');
            BackupManager.createZipBackup(zipPath);
            const zipSize = (statSync(zipPath).size / 1024 / 1024).toFixed(2);
            console.log(`Backup zip created: ${zipPath} (${zipSize} MB)`);

            // 3. Upload
            console.log('Uploading to FLM server...');
            const result = await BackupManager.uploadZip(
                zipPath, serverUrl, licenseKey,
                'cli', 'CLI', label, false
            );
            console.log(`Upload complete! Backup ID: ${result.backupId}`);
            console.log(`Download URL: ${result.downloadUrl}\n`);
            Logger.success('✅ Backup created and uploaded via CLI', "CLI");
        } catch (e: any) {
            Logger.error(`❌ Backup failed: ${e.message}`, "CLI");
        } finally {
            // Cleanup local zip
            try { rmSync(zipPath, { force: true }); } catch {}
        }
    }

    static stop() {
        if (this.rl) {
            this.rl.close();
        }
    }
}
