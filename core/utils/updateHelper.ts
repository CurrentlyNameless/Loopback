import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  renameSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'node:child_process';
import figlet from 'figlet';
import jsyaml from 'js-yaml';
import { parseDocument, isMap, Scalar } from 'yaml';
import type { Document } from 'yaml';
import { logger, Logger } from './logger.ts';

// ─── Container & Pterodactyl Panel Protection ───────────────────────────────

/**
 * Checks if the bot is running inside a Pterodactyl or Docker container environment.
 */
export function isPterodactyl(): boolean {
  return (
    typeof process.env.PTERODACTYL === 'string' ||
    typeof process.env.CONTAINER === 'string' ||
    existsSync('/.dockerenv') ||
    existsSync('/tmp/pterodactyl') ||
    existsSync(join(process.cwd(), '.pterodactyl'))
  );
}

/**
 * Writes a temporary lockfile (.update-in-progress) so container hosting panels
 * (e.g. Pterodactyl / Docker) don't interpret process restarts as crashes.
 */
export function writeContainerLockfile(cwd: string = process.cwd()): string {
  const lockPath = join(cwd, '.update-in-progress');
  try {
    writeFileSync(
      lockPath,
      JSON.stringify(
        {
          timestamp: Date.now(),
          pid: process.pid,
          status: 'updating',
          note: 'Prevent Pterodactyl/Docker container crash-restart loop during update extraction',
        },
        null,
        2,
      ),
      'utf-8',
    );
    if (isPterodactyl()) {
      const envName = process.env.PTERODACTYL ? 'Pterodactyl container' : existsSync('/.dockerenv') ? 'Docker container' : 'Container environment';
      logger.info(`🛡️ ${envName} lock active (preventing crash-restarts)`, 'UpdateHelper');
    }
  } catch (err) {
    logger.warn(`Could not write container lockfile: ${(err as Error).message}`, 'UpdateHelper');
  }
  return lockPath;
}

/**
 * Removes the container lockfile upon update completion or rollback.
 */
export function removeContainerLockfile(cwd: string = process.cwd()): void {
  const lockPath = join(cwd, '.update-in-progress');
  if (existsSync(lockPath)) {
    try {
      rmSync(lockPath, { force: true });
      logger.debug('Container update lockfile removed', 'UpdateHelper');
    } catch {}
  }
}

/**
 * Safely reboots the bot process.
 * In Docker/Pterodactyl/Pelican container environments, Wings daemon considers any process
 * exiting in < 60s of uptime as a "crash loop" and aborts automatic restart.
 * This function guarantees that uptime >= 62s before calling process.exit(0), ensuring
 * the panel always triggers an immediate, clean automatic restart without throttling.
 */
export async function safeContainerReboot(customDelayMs: number = 1000): Promise<void> {
  const uptime = process.uptime();
  const isContainer = isPterodactyl();

  if (isContainer && uptime < 62) {
    const waitSeconds = Math.ceil(62 - uptime);
    logger.info(
      `🛡️ Pelican/Docker anti-throttle: Holding exit for ${waitSeconds}s (current uptime: ${Math.floor(uptime)}s) so panel cleanly auto-restarts...`,
      'UpdateHelper'
    );
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  } else if (customDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, customDelayMs));
  }

  logger.success('🚀  Process exiting cleanly for container restart...', 'System');
  process.exit(0);
}


// ─── Update pacing ───────────────────────────────────────────────────────────

/**
 * Non-blocking asynchronous delay.
 * Keeps the Node.js / Bun event loop completely responsive so WebSocket
 * packets, pings, heartbeats, and network I/O are processed immediately.
 */
function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a labelled update step with a leading divider, relays progress,
 * and pauses non-blockingly so the operator and dashboard can track progress.
 *
 * @param stepNum 1-based step index matching UPDATE_STEPS
 * @param label   Human-readable step label, e.g. "Step 3 — Extracting archive"
 * @param delayMs Milliseconds to pause after logging (default 300 ms).
 */
let activeStepDone: (() => void) | null = null;

async function logStep(
  stepNum: number,
  label: string,
  delayMs = 300,
  onProgress?: UpdateProgressCallback,
): Promise<void> {
  if (activeStepDone) {
    try { activeStepDone(); } catch {}
    activeStepDone = null;
  }
  const cleanLabel = label.replace(/^Step\s+\d+\s+—\s+/, '');
  activeStepDone = Logger.phase(cleanLabel);
  if (onProgress) {
    try {
      await Promise.resolve(onProgress(stepNum, label));
    } catch {}
  }
  if (delayMs > 0) await delay(delayMs);
}

function finishLogStep(): void {
  if (activeStepDone) {
    try { activeStepDone(); } catch {}
    activeStepDone = null;
  }
}

// ─── Progress callback ───────────────────────────────────────────────────────

/**
 * Called by applyBotUpdate at the start of each step so the caller can
 * relay real-time progress over whatever channel it has (e.g. WebSocket).
 *
 * @param step    1-based step index matching UPDATE_STEPS in Fleet.tsx
 * @param label   Short human-readable label for the step
 */
export type UpdateProgressCallback = (step: number, label: string) => void | Promise<void>;

// ─── Semver helpers ──────────────────────────────────────────────────────────

/**
 * Compares two semver-ish version strings (e.g. "1.2.3", "0.0.1.4").
 * Returns  1 if `a` is newer, -1 if `b` is newer, 0 if equal.
 * Non-numeric segments are treated as 0 so partial versions still work.
 */
function compareSemver(a: string, b: string): number {
  const normalize = (v: string) =>
    v.replace(/^v/, '').split('.').map((s) => parseInt(s, 10) || 0);
  const pa = normalize(a);
  const pb = normalize(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PreservedModuleYml {
  name: string;
  content: string;
  parsed: Record<string, unknown>;
}

interface PreservedModuleData {
  name: string;
  files: Map<string, Buffer>;
}

interface DisabledModuleUpdate {
  /** Folder name as it lives on disk, e.g. "-auto-mod" */
  disabledFolderName: string;
  /** Canonical name from the update package, e.g. "auto-mod" */
  canonicalName: string;
  /** Version that was installed (from the disabled module's module.yml) */
  installedVersion: string;
  /** Version shipping in the update package */
  updateVersion: string;
}

interface PreservedState {
  oldConfigYml: string | null;
  oldConfigParsed: Record<string, unknown> | null;
  moduleYmls: PreservedModuleYml[];
  moduleData: PreservedModuleData[];
  guildConfigs: Map<string, Buffer>; // core/config/guild-configs/*.json
  coreConfigs: Map<string, Buffer>; // all core/config/**/* (e.g. disabled-commands.json, license.cache.json)
  userUploads: Map<string, Buffer>; // all core/public/uploads/**/* and public/uploads/**/*
  envFile: Buffer | null; // .env
  /** Disabled modules that were upgraded and re-enabled by this update */
  disabledModuleUpdates: DisabledModuleUpdate[];
}

// Sub-directories inside each module that carry persistent user data / assets / resources
const MODULE_DATA_DIRS = ['data', 'storage', 'cache', 'database', 'db', 'resources', 'uploads'];

const BACKUP_DIR_NAME = 'backups';
const DEFAULT_BACKUP_RETENTION = 5;

// Entries that should never be copied into a rollback backup.
// The backup is intentionally broad (full cwd), so only obviously
// non-restorable / non-sensical entries are excluded by default.
const DEFAULT_BACKUP_EXCLUDES = [
  'node_modules',
  '.bun',
  'update.zip',
];

// Top-level paths that make up the production bot. Only these are
// copied into a rollback backup, restored on rollback, and applied
// from an update. Everything else (dev scripts, build artifacts,
// install metadata, VCS noise, etc.) is excluded so the backup is a
// clean snapshot of "what we ship".
const DEFAULT_BACKUP_INCLUDES = [
  'core',
  'modules',
  'package.json',
  'config.yml',
  'tsconfig.json',
  'index.ts',
];

// Install-time and dev-only artifacts. They exist in the source tree
// (and may briefly exist in cwd during the reinstall phase), but they
// must never be in the shipped install, the rollback backup, or the
// post-update live folder. The cleanup phase removes them twice:
//   1. pre-backup  — so the backup is clean
//   2. post-update — so the freshly updated install is clean
const DEFAULT_CLEANUP_TARGETS = [
  // dev / test scripts
  'test-yaml.ts',
  'obfuscate-ts.ts',
  'deobfuscate.ts',
  'build-release.ts',
  // VCS / repo noise
  '.gitignore',
  // build output cache
  'tsconfig.tsbuildinfo',
  // install metadata (needed by `bun i` then removed)
  'package-lock.json',
  'bun.lock',
  // version / release metadata (regenerated by the updater)
  'manifest.json',
];

let BACKUP_EXCLUDES: string[] = [...DEFAULT_BACKUP_EXCLUDES, BACKUP_DIR_NAME];
let BACKUP_INCLUDES: string[] = [...DEFAULT_BACKUP_INCLUDES];
let CLEANUP_TARGETS: string[] = [...DEFAULT_CLEANUP_TARGETS];

export function setBackupExcludes(extra: string[] = []): void {
  const merged = new Set([...DEFAULT_BACKUP_EXCLUDES, ...extra, BACKUP_DIR_NAME]);
  BACKUP_EXCLUDES = Array.from(merged);
}

export function setBackupIncludes(includes: string[] = []): void {
  BACKUP_INCLUDES = includes.length > 0 ? [...includes] : [...DEFAULT_BACKUP_INCLUDES];
}

export function setCleanupTargets(targets: string[] = []): void {
  CLEANUP_TARGETS = targets.length > 0 ? [...targets] : [...DEFAULT_CLEANUP_TARGETS];
}

// ─── Filesystem helpers ──────────────────────────────────────────────────────

function copyDirectory(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });

  for (const entry of readdirSync(src)) {
    if (BACKUP_EXCLUDES.includes(entry)) continue;

    const srcPath = join(src, entry);
    const dstPath = join(dst, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
}

// ─── YAML helpers ────────────────────────────────────────────────────────────

/**
 * Deep-merge two plain objects.
 * - `base` is the update's new defaults
 * - `overlay` is the user's existing values (takes priority for primitive values)
 *
 * Objects are merged recursively. Arrays from `overlay` replace those in `base`.
 * `null` values in `overlay` are kept (explicit null overrides the default).
 * `undefined` values in `overlay` are ignored (the base value is kept).
 */
function parseYamlSafe(content: string): Record<string, unknown> | null {
  try {
    const parsed = jsyaml.load(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function hasYamlAsciiHeader(content: string): boolean {
  const headerLines = content.split(/\r?\n/).slice(0, 60);
  let artLineCount = 0;

  for (const line of headerLines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('#')) continue;

    const comment = trimmed.slice(1);
    if (
      comment.length >= 8 &&
      (
        /[\u2500-\u257f\u2580-\u259f]/u.test(comment) ||
        /[_/\\|()[\]{}<>]/.test(comment)
      )
    ) {
      artLineCount++;
    }
  }

  return artLineCount >= 3;
}

function readYamlStringValue(
  source: Record<string, unknown> | null,
  key: string,
  fallback: string,
): string {
  const value = source?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function buildYamlAsciiHeader(title: string, description: string): string {
  let art: string;
  try {
    art = figlet.textSync(title, { font: 'ANSI Shadow' });
  } catch {
    try {
      art = figlet.textSync(title, { font: 'Standard' });
    } catch {
      art = title;
    }
  }

  const divider = '# ' + '='.repeat(78);
  const artLines = art
    .replace(/\s+$/g, '')
    .split('\n')
    .map((line) => `# ${line}`);

  return [
    divider,
    ...artLines,
    '#',
    divider,
    '# Made with ❤️ Currently_Nameless and OnedEyePete',
    divider,
    `# ${description}`,
    divider,
  ].join('\n');
}

function ensureYamlAsciiHeader(
  content: string,
  title: string,
  description: string,
): string {
  const body = content
    .replace(/^\uFEFF/, '')
    .replace(/^(?:#[^\n]*\n?)*\s*/m, '');

  return `${buildYamlAsciiHeader(title, description)}\n\n${body}`;
}

/**
 * Recursively adds keys from `newBase` that are missing in `docNode`.
 *
 * Uses `.has()` instead of checking whether `.get()` returns undefined —
 * the latter is unreliable on complex node types and can cause `.set()` to
 * create duplicate keys, which js-yaml then refuses to parse.
 *
 * Also guards against integer vs string key collisions (e.g. 0 vs "0"):
 * Object.entries() always yields string keys, but the existing YAML document
 * may have stored them as integers. We check both forms before deciding a key
 * is truly absent.
 */
function addMissingYamlKeys(docNode: any, newBase: any) {
  if (typeof newBase !== 'object' || newBase === null) return;

  for (const [key, value] of Object.entries(newBase)) {
    // Check both the string key and its numeric equivalent so that
    // a YAML file with integer key `0` is not duplicated by string key `"0"`.
    const numericKey = Number(key);
    const alreadyExists =
      docNode.has(key) ||
      (!Number.isNaN(numericKey) && docNode.has(numericKey));

    if (alreadyExists) {
      // Key already exists — only recurse into nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Prefer fetching by whichever form actually exists in the document
        const existingNode =
          docNode.get(key, true) ??
          (!Number.isNaN(numericKey) ? docNode.get(numericKey, true) : undefined);
        if (isMap(existingNode)) {
          addMissingYamlKeys(existingNode, value);
        }
      }
    } else {
      // Key is genuinely absent — safe to add
      docNode.set(key, value);
    }
  }
}

function getYamlMapKey(docNode: any, key: string): string | number {
  const numericKey = Number(key);
  if (!Number.isNaN(numericKey) && docNode.has(numericKey)) {
    return numericKey;
  }
  return key;
}

/**
 * Overlays the user's parsed values onto an update YAML document.
 *
 * The update document stays as the formatting/comment/header source, so
 * generated Figlet banners and fresh documentation comments survive updates.
 * User values still win, including unknown keys that only exist locally.
 */
function overlayYamlValues(
  doc: Document,
  docNode: any,
  overlay: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) continue;

    const mapKey = getYamlMapKey(docNode, key);
    const existingNode = docNode.get(mapKey, true);

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      isMap(existingNode)
    ) {
      overlayYamlValues(doc, existingNode, value as Record<string, unknown>);
    } else {
      if (typeof value === 'string') {
        const scalar = new Scalar(value);
        scalar.type = 'QUOTE_DOUBLE';
        docNode.set(mapKey, scalar);
      } else {
        docNode.set(mapKey, doc.createNode(value));
      }
    }
  }
}

// ─── Backup / Rollback ───────────────────────────────────────────────────────

function createBackup(cwd: string): string {
  const backupRoot = join(cwd, BACKUP_DIR_NAME);
  mkdirSync(backupRoot, { recursive: true });

  const backupPath = join(backupRoot, `backup_${Date.now()}`);

  logger.info(`Creating full backup at ${backupPath}`, 'UpdateHelper');

  copyDirectory(cwd, backupPath);

  return backupPath;
}

function restoreBackup(backupPath: string, cwd: string): void {
  logger.warn('Update failed — restoring backup...', 'UpdateHelper');

  // Only wipe the bot's own paths (whitelist), so we never touch unrelated
  // folders living alongside the bot in cwd.
  for (const entry of BACKUP_INCLUDES) {
    const path = join(cwd, entry);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
  }

  // Copy the whitelisted paths from the backup back into cwd
  for (const entry of BACKUP_INCLUDES) {
    const srcPath = join(backupPath, entry);
    if (!existsSync(srcPath)) continue;

    const dstPath = join(cwd, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, dstPath);
    } else {
      const parent = join(dstPath, '..');
      mkdirSync(parent, { recursive: true });
      copyFileSync(srcPath, dstPath);
    }
  }

  logger.info('Backup restored successfully', 'UpdateHelper');
}

function cleanupOldBackups(cwd: string, keep: number = DEFAULT_BACKUP_RETENTION): void {
  const backupRoot = join(cwd, BACKUP_DIR_NAME);
  if (!existsSync(backupRoot)) return;

  const allEntries = readdirSync(backupRoot);

  // 1. Force wipe any old stray update-temp folders
  for (const entry of allEntries) {
    if (entry.startsWith('update-temp')) {
      const fullPath = join(backupRoot, entry);
      try {
        rmSync(fullPath, { recursive: true, force: true });
        logger.debug(`Wiped stray temp folder: ${entry}`, 'UpdateHelper');
      } catch (err: any) {
        try {
          if (process.platform !== 'win32') {
            require('node:child_process').execSync(`rm -rf "${fullPath}"`);
            logger.debug(`Force-wiped stray temp folder via shell: ${entry}`, 'UpdateHelper');
          }
        } catch {
          logger.warn(`Could not remove ${entry}: ${err.message}`, 'UpdateHelper');
        }
      }
    }
  }

  // 2. Rotate standard backups
  const backups = allEntries
    .filter((entry) => entry.startsWith('backup_'))
    .sort()
    .reverse();

  if (backups.length <= keep) return;

  for (const old of backups.slice(keep)) {
    const fullPath = join(backupRoot, old);
    try {
      rmSync(fullPath, { recursive: true, force: true });
      logger.debug(`Removed old backup: ${old}`, 'UpdateHelper');
    } catch (err: any) {
      try {
        if (process.platform !== 'win32') {
          require('node:child_process').execSync(`rm -rf "${fullPath}"`);
        }
      } catch {}
    }
  }

  logger.info(`Cleaned up old backups (kept ${keep} of ${backups.length})`, 'UpdateHelper');
}

// ─── Cleanup phase ───────────────────────────────────────────────────────────

/**
 * Removes dev/build files from cwd. Called both before the backup
 * (so the backup is a clean snapshot of "what we ship") and after
 * the update is applied (so a freshly updated install never carries
 * dev-only scripts, even if the update package re-introduced them).
 */
function runCleanupPhase(cwd: string, phase: 'pre-backup' | 'post-update'): void {
  if (CLEANUP_TARGETS.length === 0) return;

  logger.info(`Running ${phase} cleanup (${CLEANUP_TARGETS.length} targets)...`, 'UpdateHelper');

  let removed = 0;
  for (const target of CLEANUP_TARGETS) {
    const targetPath = join(cwd, target);
    if (!existsSync(targetPath)) continue;

    try {
      rmSync(targetPath, { recursive: true, force: true });
      removed++;
      logger.debug(`[${phase}] Removed: ${target}`, 'UpdateHelper');
    } catch (err) {
      logger.warn(
        `[${phase}] Could not remove ${target}: ${(err as Error).message}`,
        'UpdateHelper',
      );
    }
  }

  if (removed > 0) {
    logger.info(
      `${phase} cleanup removed ${removed} dev/build file${removed === 1 ? '' : 's'}`,
      'UpdateHelper',
    );
  } else {
    logger.debug(`${phase} cleanup: nothing to remove`, 'UpdateHelper');
  }
}

/**
 * Deletes the update zip once the update has been successfully applied.
 * The rollback backup already contains a full snapshot of the previous
 * install, so keeping the zip around is redundant and wastes disk space.
 *
 * Checks both the original zipPath and a copy in cwd (in case the zip
 * was placed there by the installer). Only touches .zip files.
 */
function deleteUpdateZip(zipPath: string): void {
  if (!zipPath) return;

  const base = zipPath.split(/[/\\]/).pop();
  if (!base) return;

  const candidates = [
    join(process.cwd(), base),
    zipPath,
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (!candidate.toLowerCase().endsWith('.zip')) continue;
    try {
      rmSync(candidate, { force: true });
      logger.info(`Deleted update archive: ${candidate}`, 'UpdateHelper');
    } catch (err) {
      logger.warn(
        `Could not delete update archive ${candidate}: ${(err as Error).message}`,
        'UpdateHelper',
      );
    }
  }
}

// ─── Preserved state collection / restoration ────────────────────────────────

function collectPreservedState(cwd: string): PreservedState {
  logger.info('Collecting preserved state...', 'UpdateHelper');

  const configPath = join(cwd, 'config.yml');
  let oldConfigYml: string | null = null;
  let oldConfigParsed: Record<string, unknown> | null = null;

  if (existsSync(configPath)) {
    try {
      oldConfigYml = readFileSync(configPath, 'utf-8');
      oldConfigParsed = parseYamlSafe(oldConfigYml);
      if (!oldConfigParsed) {
        logger.warn('Existing config.yml could not be parsed — raw content will be preserved for merge', 'UpdateHelper');
      }
    } catch (err) {
      logger.warn(`Could not read config.yml: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  // Collect all module.yml files and persistent module data/resource directories
  const moduleYmls: { name: string; parsed: Record<string, unknown>; raw: string }[] = [];
  const moduleData: { name: string; files: Map<string, Buffer> }[] = [];
  const modulesDir = join(cwd, 'modules');

  if (existsSync(modulesDir)) {
    try {
      for (const modName of readdirSync(modulesDir)) {
        const modPath = join(modulesDir, modName);
        if (!statSync(modPath).isDirectory()) continue;

        // Preserve module.yml
        const ymlPath = join(modPath, 'module.yml');
        if (existsSync(ymlPath)) {
          try {
            const raw = readFileSync(ymlPath, 'utf-8');
            const parsed = parseYamlSafe(raw);
            if (parsed) {
              moduleYmls.push({ name: modName, parsed, raw });
            }
          } catch (e: any) {
            logger.warn(`Could not read module.yml for ${modName}: ${e.message}`, 'UpdateHelper');
          }
        }

        // Preserve all persistent module data / storage / resources directories
        const filesMap = new Map<string, Buffer>();
        for (const dataSubDir of MODULE_DATA_DIRS) {
          const fullDataDir = join(modPath, dataSubDir);
          if (existsSync(fullDataDir)) {
            collectDirectoryFiles(fullDataDir, filesMap, dataSubDir);
          }
        }
        if (filesMap.size > 0) {
          moduleData.push({ name: modName, files: filesMap });
        }
      }
      logger.info(`Preserved ${moduleYmls.length} module config(s) and ${moduleData.length} module data store(s)`, 'UpdateHelper');
    } catch (err) {
      logger.warn(`Could not read modules directory: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  // Collect all core/config files (guild configs, disabled commands, license data, dashboard custom configs)
  const coreConfigs = new Map<string, Buffer>();
  const guildConfigs = new Map<string, Buffer>();
  const coreConfigDir = join(cwd, 'core', 'config');
  if (existsSync(coreConfigDir)) {
    try {
      collectDirectoryFiles(coreConfigDir, coreConfigs, '');
      logger.info(`Preserved ${coreConfigs.size} core/config file(s) (including dashboard settings)`, 'UpdateHelper');

      // Also populate guildConfigs for backward compatibility
      for (const [relPath, buf] of coreConfigs.entries()) {
        if (relPath.startsWith('guild-configs') && relPath.endsWith('.json')) {
          const fileName = relPath.split(/[/\\]/).pop() || relPath;
          guildConfigs.set(fileName, buf);
        }
      }
    } catch (err) {
      logger.warn(`Could not read core/config directory: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  // Collect user-uploaded assets (wallpapers, videos, audio FX, custom icons, banners)
  const userUploads = new Map<string, Buffer>();
  const uploadCandidates = [
    join(cwd, 'core', 'public', 'uploads'),
    join(cwd, 'public', 'uploads'),
    join(cwd, 'core', 'services', 'dashboard', 'public', 'uploads'),
  ];
  for (const uploadDir of uploadCandidates) {
    if (existsSync(uploadDir)) {
      try {
        collectDirectoryFiles(uploadDir, userUploads, '');
      } catch (err) {
        logger.warn(`Could not collect uploads from ${uploadDir}: ${(err as Error).message}`, 'UpdateHelper');
      }
    }
  }
  if (userUploads.size > 0) {
    logger.info(`Preserved ${userUploads.size} user upload file(s) (dashboard media & assets)`, 'UpdateHelper');
  }

  // Collect .env if present
  let envFile: Buffer | null = null;
  const envPath = join(cwd, '.env');
  if (existsSync(envPath)) {
    try {
      envFile = readFileSync(envPath);
      logger.info('Preserved .env configuration', 'UpdateHelper');
    } catch {}
  }

  logger.info('Preserved config.yml and all module & dashboard variables', 'UpdateHelper');

  return {
    oldConfigYml,
    oldConfigParsed,
    moduleYmls,
    moduleData,
    guildConfigs,
    coreConfigs,
    userUploads,
    envFile,
    disabledModuleUpdates: [],
  };
}

function collectDirectoryFiles(dir: string, map: Map<string, Buffer>, prefix: string): void {
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const relativeKey = join(prefix, entry);

      if (statSync(fullPath).isDirectory()) {
        collectDirectoryFiles(fullPath, map, relativeKey);
      } else {
        map.set(relativeKey, readFileSync(fullPath));
      }
    }
  } catch (err) {
    logger.warn(`Could not collect files from ${dir}: ${(err as Error).message}`, 'UpdateHelper');
  }
}

/**
 * Merges the user's old config.yml with the update's new config.yml.
 *
 * Strategy: take the new config as the base, then overlay the user's old values.
 * This means:
 *  - New fields introduced by the update appear with their defaults
 *  - User-customized values survive the update
 *  - If the merged output fails to parse, falls back to the new config
 *  - If the old config was unreadable, the new config is kept as-is
 *  - If there's no new config from the update, the old config is kept
 */
function mergeConfigYml(
  newConfigPath: string,
  oldConfigRaw: string | null,
  oldConfigParsed: Record<string, unknown> | null,
): string | null {
  // If we have a new config from the update, try to merge with old config
  if (existsSync(newConfigPath)) {
    try {
      let newRaw = readFileSync(newConfigPath, 'utf-8');
      const newParsed = parseYamlSafe(newRaw);
      const configTitle = readYamlStringValue(
        oldConfigParsed,
        'name',
        readYamlStringValue(newParsed, 'name', 'FloofCore Reborn'),
      );
      newRaw = ensureYamlAsciiHeader(
        newRaw,
        'FloofCore Reborn',
        'FloofCore Reborn - Main configuration file',
      );

      if (oldConfigRaw) {
        if (newParsed && oldConfigParsed) {
          logger.info('Merging config.yml — update defaults + user customizations', 'UpdateHelper');

          // Parse the old document to preserve its comments and layout exactly
          const doc = parseDocument(newRaw);

          // Add any new keys from the update that the user doesn't have yet
          if (doc.contents && isMap(doc.contents)) {
            overlayYamlValues(doc, doc.contents, oldConfigParsed);
          } else if (!doc.contents) {
            return newRaw; // old config is totally empty — use new
          }

          const merged = doc.toString();

          // Validate the merged output is parseable before returning it
          if (parseYamlSafe(merged) !== null) {
            return merged;
          }

          logger.warn(
            'Merged config.yml failed parse validation — falling back to new config defaults',
            'UpdateHelper',
          );
        }
      }

      // Return the new config content when merge wasn't possible
      // (old config was null, or new config couldn't be parsed as an object)
      return newRaw;
    } catch (err) {
      logger.warn(`Could not process config.yml from update: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  // Fallback: keep the old config, but still inject the ascii header if missing
  if (oldConfigRaw) {
    const fallbackTitle = readYamlStringValue(oldConfigParsed, 'name', 'FloofCore Reborn');
    return ensureYamlAsciiHeader(
      oldConfigRaw,
      'FloofCore Reborn',
      'FloofCore Reborn - Main configuration file',
    );
  }

  return null;
}

/**
 * Merges each module's old module.yml with the update's new version.
 *
 * Same strategy as config.yml:
 *  - New fields from the update appear with defaults
 *  - User-customized values are preserved
 *  - If the merged output fails to parse, falls back to the new module config
 */
function mergeModuleYml(
  updateModuleDir: string,
  oldName: string,
  oldParsed: Record<string, unknown>,
  oldRaw: string,
): string | null {
  const newModuleYmlPath = join(updateModuleDir, oldName, 'module.yml');

  if (existsSync(newModuleYmlPath) && oldRaw) {
    try {
      let newRaw = readFileSync(newModuleYmlPath, 'utf-8');
      const newParsed = parseYamlSafe(newRaw);
      const moduleTitle = readYamlStringValue(
        oldParsed,
        'name',
        readYamlStringValue(newParsed, 'name', oldName),
      );
      newRaw = ensureYamlAsciiHeader(
        newRaw,
        moduleTitle,
        `${moduleTitle} Module Configuration`,
      );

      if (newParsed) {
        logger.debug(`Merging module.yml for ${oldName}`, 'UpdateHelper');
        const doc = parseDocument(newRaw);

        if (doc.contents && isMap(doc.contents)) {
          const { version: _v, ...userSettings } = oldParsed;
          overlayYamlValues(doc, doc.contents, userSettings);

          // Belt-and-suspenders: force the update's version field after merge
          const updateVersion = newParsed?.['version'];
          if (updateVersion !== undefined) {
            doc.contents.set('version', String(updateVersion));
          }
        } else if (!doc.contents) {
          return newRaw;
        }

        const merged = doc.toString();

        // Validate the merged output is parseable before returning it
        if (parseYamlSafe(merged) !== null) {
          return merged;
        }

        logger.warn(
          `Merged module.yml for ${oldName} failed parse validation — falling back to new module defaults`,
          'UpdateHelper',
        );
        return newRaw;
      }
    } catch (err) {
      logger.warn(`Could not merge module.yml for ${oldName}: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  // No update version exists for this module — keep the old yml but still
  // ensure it carries the ascii header/placeholder block.
  if (oldRaw) {
    const fallbackTitle = readYamlStringValue(
      parseYamlSafe(oldRaw),
      'name',
      oldName,
    );
    return ensureYamlAsciiHeader(
      oldRaw,
      fallbackTitle,
      `${fallbackTitle} Module Configuration`,
    );
  }

  return null;
}

function restorePreservedState(
  cwd: string,
  extractDir: string,
  state: PreservedState,
): void {
  logger.info('Restoring preserved state...', 'UpdateHelper');

  // ─── config.yml — merge old user config with new update defaults ───
  const mergedConfig = mergeConfigYml(
    join(extractDir, 'config.yml'),
    state.oldConfigYml,
    state.oldConfigParsed,
  );

  const configDest = join(cwd, 'config.yml');
  if (mergedConfig !== null) {
    writeFileSync(configDest, mergedConfig, 'utf-8');
    logger.debug('config.yml merged and written', 'UpdateHelper');
  } else if (!existsSync(configDest)) {
    // Last resort: copy config.yml directly from the update package
    const updateConfig = join(extractDir, 'config.yml');
    if (existsSync(updateConfig)) {
      writeFileSync(configDest, readFileSync(updateConfig, 'utf-8'), 'utf-8');
      logger.info('config.yml restored from update package (fallback)', 'UpdateHelper');
    }
  }

  // ─── module.yml — merge old user module configs with update release defaults ───
  if (state.moduleYmls.length > 0) {
    const updateModulesDir = join(extractDir, 'modules');
    for (const mod of state.moduleYmls) {
      try {
        const mergedModuleYml = mergeModuleYml(
          updateModulesDir,
          mod.name,
          mod.parsed,
          mod.raw,
        );
        const targetDir = join(cwd, 'modules', mod.name);
        const targetYml = join(targetDir, 'module.yml');
        mkdirSync(targetDir, { recursive: true });

        if (mergedModuleYml !== null) {
          writeFileSync(targetYml, mergedModuleYml, 'utf-8');
          logger.debug(`Merged & preserved module.yml for ${mod.name}`, 'UpdateHelper');
        } else if (!existsSync(targetYml) && mod.raw) {
          writeFileSync(targetYml, mod.raw, 'utf-8');
        }
      } catch (err: any) {
        logger.warn(`Could not merge module.yml for ${mod.name}: ${err.message}`, 'UpdateHelper');
      }
    }
    logger.info(`Merged and preserved ${state.moduleYmls.length} module config(s)`, 'UpdateHelper');
  }

  // ─── Module Data Stores (databases, uploads, logs, resources) ───
  if (state.moduleData.length > 0) {
    for (const modData of state.moduleData) {
      try {
        const targetModDir = join(cwd, 'modules', modData.name);
        mkdirSync(targetModDir, { recursive: true });
        for (const [relPath, buffer] of modData.files.entries()) {
          const destPath = join(targetModDir, relPath);
          mkdirSync(join(destPath, '..'), { recursive: true });
          writeFileSync(destPath, buffer);
        }
      } catch (err: any) {
        logger.warn(`Could not restore data for ${modData.name}: ${err.message}`, 'UpdateHelper');
      }
    }
    logger.info(`Restored ${state.moduleData.length} persistent module data/resource store(s)`, 'UpdateHelper');
  }

  // ─── Core Configurations (guild configs, disabled commands, license, dashboard settings) ───
  if (state.coreConfigs && state.coreConfigs.size > 0) {
    const coreConfigDir = join(cwd, 'core', 'config');
    mkdirSync(coreConfigDir, { recursive: true });

    for (const [relPath, buffer] of state.coreConfigs.entries()) {
      try {
        const filePath = join(coreConfigDir, relPath);
        mkdirSync(join(filePath, '..'), { recursive: true });
        writeFileSync(filePath, buffer);
      } catch (err) {
        logger.warn(`Could not restore core config ${relPath}: ${(err as Error).message}`, 'UpdateHelper');
      }
    }
    logger.info(`Restored ${state.coreConfigs.size} core/config file(s) (including dashboard settings)`, 'UpdateHelper');
  } else if (state.guildConfigs.size > 0) {
    // Fallback: per-guild module config overrides
    const guildConfigsDir = join(cwd, 'core', 'config', 'guild-configs');
    mkdirSync(guildConfigsDir, { recursive: true });

    for (const [filename, buffer] of state.guildConfigs.entries()) {
      try {
        const filePath = join(guildConfigsDir, filename);
        writeFileSync(filePath, buffer);
      } catch (err) {
        logger.warn(
          `Could not restore guild config ${filename}: ${(err as Error).message}`,
          'UpdateHelper',
        );
      }
    }
    logger.info(`Restored ${state.guildConfigs.size} guild config file(s)`, 'UpdateHelper');
  }

  // ─── User Uploads (wallpapers, videos, audio FX, custom icons, banners) ───
  if (state.userUploads && state.userUploads.size > 0) {
    const uploadsDir = join(cwd, 'core', 'public', 'uploads');
    mkdirSync(uploadsDir, { recursive: true });

    for (const [relPath, buffer] of state.userUploads.entries()) {
      try {
        const filePath = join(uploadsDir, relPath);
        mkdirSync(join(filePath, '..'), { recursive: true });
        writeFileSync(filePath, buffer);
      } catch (err) {
        logger.warn(`Could not restore upload ${relPath}: ${(err as Error).message}`, 'UpdateHelper');
      }
    }
    logger.info(`Restored ${state.userUploads.size} user upload file(s) (dashboard media & assets)`, 'UpdateHelper');
  }

  // ─── Environment Configuration (.env) ───
  if (state.envFile) {
    try {
      writeFileSync(join(cwd, '.env'), state.envFile);
      logger.info('Restored .env configuration', 'UpdateHelper');
    } catch (err) {
      logger.warn(`Could not restore .env: ${(err as Error).message}`, 'UpdateHelper');
    }
  }

  logger.info('All preserved state, variables, dashboard configs, and comments restored successfully', 'UpdateHelper');
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/** On Linux, unzip warnings (e.g. Windows backslash paths) cause exit code 1.
 *  This walks the temp dir and renames any entries with `\` in their name to use `/`. */
function normalizeExtractedPaths(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);

    if (entry.includes('\\')) {
      const fixedName = entry.replace(/\\/g, '/');
      const fixedPath = join(dir, fixedName);
      const parent = join(dir, fixedName.split('/').slice(0, -1).join('/'));
      mkdirSync(parent, { recursive: true });
      renameSync(fullPath, fixedPath);

      // Recurse into directory if it was one
      if (existsSync(fixedPath) && statSync(fixedPath).isDirectory()) {
        normalizeExtractedPaths(fixedPath);
      }
    } else if (statSync(fullPath).isDirectory()) {
      normalizeExtractedPaths(fullPath);
    }
  }
}

function extractArchive(zipPath: string, tempDir: string): string {
  const isWin = process.platform === 'win32';

  if (isWin) {
    const psPath = zipPath.replace(/\\/g, '\\\\');
    execSync(
      `powershell -Command "Expand-Archive -Path '${psPath}' -DestinationPath '${tempDir}' -Force"`,
      { timeout: 120000 },
    );
  } else {
    // unzip returns 1 for warnings (e.g. Windows backslash paths in ZIP),
    // which would crash the update. Treat exit 1 as non-fatal.
    try {
      execSync(`unzip -o '${zipPath}' -d '${tempDir}'`, { timeout: 120000 });
    } catch (e: any) {
      if (e.status && (e.status as number) > 1) throw e;
    }
  }

  // Fix any backslash paths the extraction tool may have created
  normalizeExtractedPaths(tempDir);

  // Auto-detects any single top-level directory in the zip
  const topLevel = readdirSync(tempDir);
  if (topLevel.length === 1) {
    const candidate = join(tempDir, topLevel[0]);
    if (statSync(candidate).isDirectory()) return candidate;
  }

  return tempDir;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validatePackage(extractDir: string): void {
  const requiredFiles = ['package.json'];

  for (const file of requiredFiles) {
    if (!existsSync(join(extractDir, file))) {
      throw new Error(`Invalid update package — missing required file: ${file}`);
    }
  }

  // Validate package.json is parseable
  try {
    const raw = readFileSync(join(extractDir, 'package.json'), 'utf-8').replace(/^\uFEFF/, '');
    JSON.parse(raw);
  } catch {
    throw new Error('Invalid update package — package.json is not valid JSON');
  }

  logger.info('Update package validated successfully', 'UpdateHelper');
}

// ─── File application ────────────────────────────────────────────────────────

/**
 * Reads a `version` field from a module.yml file on disk.
 * Returns '0.0.0' if the file is absent or unparseable.
 */
function readModuleVersion(moduleDir: string): string {
  const ymlPath = join(moduleDir, 'module.yml');
  if (!existsSync(ymlPath)) return '0.0.0';
  try {
    const parsed = parseYamlSafe(readFileSync(ymlPath, 'utf-8'));
    const v = parsed?.['version'];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const PROTECTED_ROOT_DIRS = new Set([
  'node_modules',
  '.bun',
  '.npm',
  BACKUP_DIR_NAME,
]);

function applyExtractedFiles(
  extractDir: string,
  cwd: string,
): void {
  // Safely copy/overlay new files from the update package
  for (const entry of readdirSync(extractDir)) {
    if (entry === BACKUP_DIR_NAME) continue;
    if (entry === 'modules') continue; // handled separately in updateModules()
    if (entry === 'config.yml') continue; // merged cleanly in restorePreservedState()
    if (!BACKUP_INCLUDES.includes(entry)) continue;

    const src = join(extractDir, entry);
    const dst = join(cwd, entry);

    if (statSync(src).isDirectory()) {
      copyDirectory(src, dst);
    } else {
      writeFileSync(dst, readFileSync(src));
    }
  }
}

function updateModules(
  extractDir: string,
  cwd: string,
  preservedState?: PreservedState,
): void {
  const src = join(extractDir, 'modules');
  const dst = join(cwd, 'modules');

  if (!existsSync(src)) return;
  if (!existsSync(dst)) {
    mkdirSync(dst, { recursive: true });
  }

  const installedDirs = readdirSync(dst).filter(m => statSync(join(dst, m)).isDirectory());
  const canonicalToInstalled = new Map<string, string>();
  for (const dir of installedDirs) {
    const canonical = dir.startsWith('-') ? dir.slice(1) : dir;
    if (!canonicalToInstalled.has(canonical) || !dir.startsWith('-')) {
      canonicalToInstalled.set(canonical, dir);
    }
  }

  const updateModules = readdirSync(src).filter(m => statSync(join(src, m)).isDirectory());

  for (const mod of updateModules) {
    const installedFolderName = canonicalToInstalled.get(mod);
    const isDisabled = !!installedFolderName && installedFolderName.startsWith('-');
    const isNew = !installedFolderName;
    const modSrc = join(src, mod);
    const modDst = join(dst, mod);
    const updateVersion = readModuleVersion(modSrc);

    // ── Preserve old module data BEFORE touching it ──────────────────────
    let oldYmlContent: string | null = null;
    let oldYmlParsed: Record<string, unknown> | null = null;
    const oldDataFiles = new Map<string, Buffer>();

    if (!isNew) {
      const oldPath = join(dst, installedFolderName!);
      const installedVersion = readModuleVersion(oldPath);
      const cmp = compareSemver(updateVersion, installedVersion);

      if (cmp <= 0) {
        logger.info(
          `Skipping module "${installedFolderName}": ` +
          `installed v${installedVersion} is up to date with or newer than update v${updateVersion}`,
          'UpdateHelper',
        );
        continue;
      }

      const oldYmlPath = join(oldPath, 'module.yml');
      if (existsSync(oldYmlPath)) {
        try {
          const content = readFileSync(oldYmlPath, 'utf-8');
          const parsed = parseYamlSafe(content);
          oldYmlContent = content;
          oldYmlParsed = parsed ?? null;
        } catch (err) {
          logger.warn(`Could not read old module.yml for ${mod}: ${(err as Error).message}`, 'UpdateHelper');
        }
      }

      for (const dataDir of MODULE_DATA_DIRS) {
        const fullDataDir = join(oldPath, dataDir);
        if (existsSync(fullDataDir)) {
          collectDirectoryFiles(fullDataDir, oldDataFiles, dataDir);
        }
      }

      rmSync(oldPath, { recursive: true, force: true });

      Logger.moduleUpdateReport({
        name: mod,
        oldVersion: installedVersion,
        newVersion: updateVersion,
        reEnabled: isDisabled,
      });
    } else {
      // not present on this bot — skip silently
      continue;
    }

    // ── Copy new module from update package ─────────────────────────────
    if (existsSync(modDst)) {
      rmSync(modDst, { recursive: true, force: true });
    }
    copyDirectory(modSrc, modDst);

    // ── Merge module.yml (preserve user settings, force update version) ─
    if (oldYmlContent && oldYmlParsed) {
      const merged = mergeModuleYml(join(extractDir, 'modules'), mod, oldYmlParsed, oldYmlContent);
      if (merged !== null) {
        writeFileSync(join(modDst, 'module.yml'), merged, 'utf-8');
        logger.debug(`module.yml for ${mod} merged with user settings`, 'UpdateHelper');
      }
    }

    // ── Restore old data/storage/cache ──────────────────────────────────
    for (const [relativePath, buffer] of oldDataFiles.entries()) {
      try {
        const filePath = join(modDst, relativePath);
        const fileDir = join(modDst, relativePath.split(/[/\\]/).slice(0, -1).join('/'));
        mkdirSync(fileDir, { recursive: true });
        writeFileSync(filePath, buffer);
      } catch (err) {
        logger.warn(
          `Could not restore data file ${relativePath} for ${mod}: ${(err as Error).message}`,
          'UpdateHelper',
        );
      }
    }

    // ── Track disabled module re-enable for summary logging ────────────
    if (isDisabled && preservedState) {
      preservedState.disabledModuleUpdates.push({
        disabledFolderName: installedFolderName!,
        canonicalName:      mod,
        installedVersion: readYamlStringValue(oldYmlParsed, 'version', '0.0.0'),
        updateVersion,
      });
    }
  }
}

// ─── Dependency installation ─────────────────────────────────────────────────

function installDependencies(cwd: string): void {
  const pkgJsonPath = join(cwd, 'package.json');
  if (!existsSync(pkgJsonPath)) return;

  logger.info('Installing dependencies...', 'UpdateHelper');

  const isBun = typeof process.versions.bun === 'string';
  const command = isBun ? 'bun install' : 'npm install';

  execSync(command, {
    cwd,
    stdio: 'inherit',
    timeout: 600000,
  });

  logger.info('Dependencies installed', 'UpdateHelper');
}

// ─── Health checks ───────────────────────────────────────────────────────────

function validateInstallation(cwd: string): void {
  logger.info('Running installation health checks...', 'UpdateHelper');

  const requiredFiles = ['package.json'];

  const missing = requiredFiles.filter((file) => !existsSync(join(cwd, file)));

  if (missing.length > 0) {
    throw new Error(`Post-update validation failed — missing files: ${missing.join(', ')}`);
  }

  // Verify the main entry point exists
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    if (pkg.main && !existsSync(join(cwd, pkg.main))) {
      logger.warn(`Main entry "${pkg.main}" from package.json not found, continuing anyway`, 'UpdateHelper');
    }
  } catch {
    logger.warn('Could not parse package.json for health check, continuing anyway', 'UpdateHelper');
  }

  logger.info('Installation health checks passed', 'UpdateHelper');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getBotVersion(): string {
  const paths: string[] = [
    join(process.cwd(), 'version.json'),
    join(process.cwd(), 'manifest.json'),
    join(process.cwd(), 'package.json'),
  ];

  for (const p of paths) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      if (data.version) return String(data.version);
    } catch {
      // continue to next path
    }
  }

  return '0.0.0.1';
}

export function writeBotVersion(version: string): void {
  try {
    const p = join(process.cwd(), 'version.json');
    writeFileSync(
      p,
      JSON.stringify({ version, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8',
    );
  } catch (err) {
    logger.error(`Failed to write version file: ${(err as Error).message}`, 'UpdateHelper');
  }
}

/**
 * Applies a bot update from the given zip archive.
 *
 * Full flow:
 *  0. Pre-backup cleanup phase: removes dev/build/install artifacts from
 *     cwd so the rollback backup is a clean snapshot of "what we ship"
 *  1. Creates a complete backup of the current installation
 *  2. Collects preserved state (user's config.yml, module.yml files, module data,
 *     and per-guild module config overrides from core/config/guild-configs/)
 *  3. Extracts the update archive
 *  4. Validates the extracted package
 *  5. Applies new files (overwrites installation)
 *  6. Restores preserved state with deep-merge:
 *     - config.yml: update's new defaults + user's existing values overlaid
 *     - guild configs (core/config/guild-configs/): restored verbatim (dashboard settings)
 *     Module files and data were already handled inline during updateModules (step 6).
 *  7. Reinstall phase: runs `bun install` (or npm install) to refresh
 *     dependencies against the new package.json
 *  8. Runs health checks
 *  9. Post-update cleanup phase: removes dev/build files, install
 *     metadata, and release files again in case the update package
 *     reintroduced them, so the live install is clean
 *  10. Deletes the update archive (the rollback backup is sufficient)
 *  11. Cleans up old backups
 *
 *  On any failure, the original installation is restored from backup.
 */
export async function applyBotUpdate(zipPath: string, newVersion?: string, onProgress?: UpdateProgressCallback): Promise<boolean> {
  const cwd = process.cwd();
  const tempDir = join(cwd, BACKUP_DIR_NAME, `update-temp-${Date.now()}`);

  // ─── Pacing budget ────────────────────────────────────────────────────────
  // Total soft target: ~12-15 seconds of visible progress across all steps.
  // Each logStep call pauses for the given delay so the operator and dashboard can read
  // what is happening before the next phase begins.
  const PACE = {
    start:          800,   // announce + pre-cleanup
    backup:         1000,  // backup creation
    preserve:       600,   // state collection
    extract:        800,   // unzip
    validate:       500,   // package validation
    applyFiles:     800,   // copy core files
    updateModules:  1000,  // update modules with version checking
    restoreState:   800,   // YAML merges + header injection
    deps:           600,   // bun install runs its own I/O
    healthCheck:    500,   // validation
    versionPersist: 300,
    cleanup:        600,   // post-update sweep
    finish:         1000,  // wrap-up
  } as const;

  logger.info(`Starting bot update from ${zipPath}`, 'UpdateHelper');
  writeContainerLockfile(cwd);

  await logStep(0, 'Step 0 — 🧹  Module unloading & Pre-backup cleanup', PACE.start, onProgress);

  // Unload all active modules to release file handles, timers, and listeners
  try {
    const { ModuleManager } = require('../managers/ModuleManager.ts');
    if (ModuleManager && typeof ModuleManager.unloadAll === 'function') {
      await ModuleManager.unloadAll();
    }
  } catch {}

  // Step 0 — Pre-backup cleanup so the backup is a clean snapshot of
  // the shipped bot (no dev/test/build helpers in the rollback).
  runCleanupPhase(cwd, 'pre-backup');

  // Step 1 — Create backup
  await logStep(1, 'Step 1 — 💾  Creating rollback backup', PACE.backup, onProgress);
  let backupPath: string | null = null;
  try {
    backupPath = createBackup(cwd);
  } catch (err) {
    logger.error(`Failed to create backup: ${(err as Error).message}`, 'UpdateHelper');
    return false;
  }

  // Step 2 — Collect preserved state
  await logStep(2, 'Step 2 — 📋  Collecting preserved state (config.yml, module.yml files, guild configs)', PACE.preserve, onProgress);
  let preservedState: PreservedState;
  try {
    preservedState = collectPreservedState(cwd);
  } catch (err) {
    logger.error(`Failed to collect preserved state: ${(err as Error).message}`, 'UpdateHelper');
    return false;
  }

  try {
    // Step 3 — Extract
    await logStep(3, 'Step 3 — 📦  Extracting update archive', PACE.extract, onProgress);
    logger.info('Extracting update package...', 'UpdateHelper');

    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        try {
          if (process.platform !== 'win32') require('node:child_process').execSync(`rm -rf "${tempDir}"`);
        } catch {}
      }
    }
    mkdirSync(tempDir, { recursive: true });

    // Copy update zip into the temp folder and extract it there
    const zipInTemp = join(tempDir, 'update.zip');
    copyFileSync(zipPath, zipInTemp);
    const extractDir = extractArchive(zipInTemp, tempDir);

    // Step 4 — Validate and get version info
    await logStep(4, 'Step 4 — 🔍  Validating update package', PACE.validate, onProgress);
    const oldVersion = getBotVersion();
    let versionToApply = newVersion || oldVersion;

    if (!newVersion) {
      const checkPaths = [
        join(extractDir, 'version.json'),
        join(extractDir, 'manifest.json'),
        join(extractDir, 'package.json'),
      ];
      for (const p of checkPaths) {
        try {
          if (existsSync(p)) {
            const raw = readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
            const data = JSON.parse(raw);
            if (data.version) {
              versionToApply = String(data.version);
              break;
            }
          }
        } catch {
          // continue
        }
      }
    }

    // ─── Downgrade Protection Barrier ───────────────────────────────────────
    // Once on v0.0.0.5 or higher, disallow downgrading to anything lower (< 0.0.0.5).
    if (compareSemver(oldVersion, '0.0.0.5') >= 0 && compareSemver(versionToApply, '0.0.0.5') < 0) {
      const errMsg = `Downgrade blocked: Current version is v${oldVersion}. Downgrading to v${versionToApply} (< v0.0.0.5) is permanently disallowed for security, database, and configuration integrity.`;
      logger.error(errMsg, 'UpdateHelper');
      await logStep(4, `Step 4 — ❌ ${errMsg}`, 0, onProgress);
      throw new Error(errMsg);
    }

    logger.info(`Updating from v${oldVersion} to v${versionToApply}`, 'UpdateHelper');

    validatePackage(extractDir);

    // Dynamic Delegation: Always execute using the NEW version's updateHelper if available
    const newHelperTs = join(extractDir, 'core', 'utils', 'updateHelper.ts');
    const newHelperJs = join(extractDir, 'core', 'utils', 'updateHelper.js');
    const newHelperPath = existsSync(newHelperTs) ? newHelperTs : (existsSync(newHelperJs) ? newHelperJs : null);

    if (newHelperPath && newHelperPath !== (import.meta as any).url) {
      try {
        const newHelper = require(newHelperPath);
        if (newHelper && typeof newHelper.applyExtractedPackage === 'function') {
          logger.info(`⚡  Running update deployment via newly extracted v${versionToApply} update engine...`, 'UpdateHelper');
          return await newHelper.applyExtractedPackage({
            extractDir,
            cwd,
            preservedState,
            versionToApply,
            zipPath,
            tempDir,
            backupPath,
            onProgress,
          });
        }
      } catch (delegateErr: any) {
        logger.warn(`Could not run extracted helper (${delegateErr.message}) — continuing with standard pipeline`, 'UpdateHelper');
      }
    }

    // Step 5 — Apply core files (everything except modules)
    await logStep(5, 'Step 5 — 🔄  Applying core files', PACE.applyFiles, onProgress);
    logger.info('Applying core update files...', 'UpdateHelper');
    applyExtractedFiles(extractDir, cwd);

    // Step 6 — Update modules (with version checking)
    await logStep(6, 'Step 6 — 🔧  Updating modules', PACE.updateModules, onProgress);
    logger.info('Updating modules...', 'UpdateHelper');
    updateModules(extractDir, cwd, preservedState);

    // Log a tidy summary of any disabled modules that were re-enabled.
    if (preservedState.disabledModuleUpdates.length > 0) {
      logger.info(
        `Re-enabled ${preservedState.disabledModuleUpdates.length} previously-disabled module(s):`,
        'UpdateHelper',
      );
      for (const m of preservedState.disabledModuleUpdates) {
        logger.info(
          `  ✔  ${m.canonicalName}  (${m.installedVersion} → ${m.updateVersion})  [was: ${m.disabledFolderName}]`,
          'UpdateHelper',
        );
      }
    }

    // Step 7 — Restore preserved state (with deep-merge for YAML files)
    await logStep(
      7,
      'Step 7 — ⚙️  Restoring config.yml (deep-merge + guild configs)',
      PACE.restoreState,
      onProgress,
    );
    restorePreservedState(cwd, extractDir, preservedState);

    // Step 8 — Reinstall phase: install dependencies (bun install / npm install)
    await logStep(8, 'Step 8 — 📥  Installing dependencies', PACE.deps, onProgress);
    installDependencies(cwd);

    // Step 9 — Health checks
    await logStep(9, 'Step 9 — 🏥  Running health checks', PACE.healthCheck, onProgress);
    validateInstallation(cwd);

    // Step 10 — Persist new version to manifest.json and version.json
    await logStep(10, `Step 10 — 📝  Persisting version v${versionToApply}`, PACE.versionPersist, onProgress);
    try {
      const manifestPath = join(cwd, 'manifest.json');
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        manifest.version = versionToApply;
        manifest.publishedAt = new Date().toISOString();
        manifest.releaseDate = new Date().toISOString();
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
        logger.info(`Persisted version v${versionToApply} to manifest.json`, 'UpdateHelper');
      }
    } catch (err) {
      logger.warn(`Could not write to manifest.json: ${(err as Error).message}`, 'UpdateHelper');
    }

    try {
      const pkgPath = join(cwd, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        pkg.version = versionToApply.replace(/^v/, '');
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
        logger.info(`Persisted version v${pkg.version} to package.json`, 'UpdateHelper');
      }
    } catch (err) {
      logger.warn(`Could not update package.json: ${(err as Error).message}`, 'UpdateHelper');
    }

    try {
      const versionJsonPath = join(cwd, 'version.json');
      writeFileSync(
        versionJsonPath,
        JSON.stringify({ version: versionToApply, updatedAt: new Date().toISOString() }, null, 2),
        'utf-8',
      );
      logger.info(`Persisted version v${versionToApply} to version.json`, 'UpdateHelper');
    } catch (err) {
      logger.warn(`Could not write to version.json: ${(err as Error).message}`, 'UpdateHelper');
    }

    // Step 11 — Post-update cleanup so the live install never carries
    // dev/test/build helpers, install metadata, or release files.
    await logStep(11, 'Step 11 — 🧹  Post-update cleanup', PACE.cleanup, onProgress);
    runCleanupPhase(cwd, 'post-update');

    // Delete the update zip (the rollback backup is sufficient)
    deleteUpdateZip(zipPath);

    // Cleanup temp
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        try {
          if (process.platform !== 'win32') {
            require('node:child_process').execSync(`rm -rf "${tempDir}"`);
          }
        } catch {}
      }
    }

    // Cleanup old backups
    cleanupOldBackups(cwd);

    // Write flag so startup skips the update-check prompt
    await logStep(12, `Step 12 — 🎉  Finalising update to v${versionToApply}`, PACE.finish, onProgress);
    let rootPath = cwd;
    try {
      const helperDir = (import.meta as any).dir || (typeof __dirname !== 'undefined' ? __dirname : null);
      if (helperDir) {
        rootPath = join(helperDir, '..', '..');
      }
    } catch {}

    const flagPath = join(rootPath, '.updated-flag');
    try {
      writeFileSync(
        flagPath,
        JSON.stringify({ version: versionToApply, updatedAt: Date.now() }),
        'utf-8',
      );
      logger.info(`Update completed successfully (v${versionToApply})`, 'UpdateHelper');
    } catch (err) {
      logger.warn(`Could not write update flag: ${(err as Error).message}`, 'UpdateHelper');
    }

    removeContainerLockfile(cwd);
    return true;
  } catch (err) {
    logger.error(`Update failed: ${(err as Error).message}`, 'UpdateHelper');

    if (backupPath) {
      try {
        restoreBackup(backupPath, cwd);
        logger.info('Rollback complete — restoring backup succeeded', 'UpdateHelper');
      } catch (restoreErr) {
        logger.error(`CRITICAL: Rollback also failed: ${(restoreErr as Error).message}`, 'UpdateHelper');
      }
    }

    // Cleanup temp
    if (existsSync(tempDir)) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }

    removeContainerLockfile(cwd);
    return false;
  }
}

export function writeBotVersion(version: string, cwd: string = process.cwd()): void {
  const clean = version.replace(/^v/, '');
  try {
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      pkg.version = clean;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
      logger.info(`Persisted version v${clean} to package.json`, 'UpdateHelper');
    }
  } catch (err: any) {
    logger.warn(`Could not update package.json: ${err.message}`, 'UpdateHelper');
  }

  try {
    const versionJsonPath = join(cwd, 'version.json');
    writeFileSync(
      versionJsonPath,
      JSON.stringify({ version: clean, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8',
    );
    logger.info(`Persisted version v${clean} to version.json`, 'UpdateHelper');
  } catch (err: any) {
    logger.warn(`Could not write to version.json: ${err.message}`, 'UpdateHelper');
  }
}

/**
 * Executes update application directly from the newly extracted package.
 * This guarantees that new database migrations, merge rules, and dependency layouts
 * run using the NEW release codebase rather than stale memory.
 */
export async function applyExtractedPackage(opts: {
  extractDir: string;
  cwd: string;
  preservedState: PreservedState;
  versionToApply: string;
  zipPath: string;
  tempDir: string;
  backupPath: string | null;
  onProgress?: UpdateProgressCallback;
}): Promise<boolean> {
  const { extractDir, cwd, preservedState, versionToApply, zipPath, tempDir, backupPath, onProgress } = opts;
  const PACE = {
    applyFiles:     400,
    updateModules:  500,
    restoreState:   500,
    deps:           300,
    healthCheck:    300,
    versionPersist: 200,
    cleanup:        300,
    finish:         500,
  };

  try {
    // Step 5 — Apply core files
    await logStep(5, 'Step 5 — 🔄  Applying core files (via v' + versionToApply + ' engine)', PACE.applyFiles, onProgress);
    applyExtractedFiles(extractDir, cwd);

    // Step 6 — Update modules
    await logStep(6, 'Step 6 — 🔧  Updating modules (via v' + versionToApply + ' engine)', PACE.updateModules, onProgress);
    updateModules(extractDir, cwd, preservedState);

    // Step 7 — Restore preserved state
    await logStep(7, 'Step 7 — ⚙️  Restoring config & modules (via v' + versionToApply + ' engine)', PACE.restoreState, onProgress);
    restorePreservedState(cwd, extractDir, preservedState);

    // Step 8 — Install dependencies
    await logStep(8, 'Step 8 — 📥  Installing dependencies (via v' + versionToApply + ' engine)', PACE.deps, onProgress);
    installDependencies(cwd);

    // Step 9 — Health checks
    await logStep(9, 'Step 9 — 🏥  Running health checks', PACE.healthCheck, onProgress);
    validateInstallation(cwd);

    // Step 10 — Persist version
    await logStep(10, `Step 10 — 📝  Persisting version v${versionToApply}`, PACE.versionPersist, onProgress);
    writeBotVersion(versionToApply, cwd);

    // Step 11 — Cleanup
    await logStep(11, 'Step 11 — 🧹  Post-update cleanup', PACE.cleanup, onProgress);
    runCleanupPhase(cwd, 'post-update');

    deleteUpdateZip(zipPath);
    if (existsSync(tempDir)) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
    cleanupOldBackups(cwd);

    await logStep(12, `Step 12 — 🎉  Finalising update to v${versionToApply}`, PACE.finish, onProgress);
    finishLogStep();
    const flagPath = join(cwd, '.updated-flag');
    try {
      writeFileSync(flagPath, JSON.stringify({ version: versionToApply, updatedAt: Date.now() }), 'utf-8');
    } catch {}

    removeContainerLockfile(cwd);
    logger.info(`✨  Successfully completed update to v${versionToApply}!`, 'UpdateHelper');
    return true;
  } catch (err: any) {
    logger.error(`Extracted update engine failed: ${err.message}`, 'UpdateHelper');
    if (backupPath) {
      try { restoreBackup(backupPath, cwd); } catch {}
    }
    if (existsSync(tempDir)) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
    removeContainerLockfile(cwd);
    return false;
  }
}
export async function applyHashUpdate(channel: string, serverUrl: string, onProgress?: UpdateProgressCallback): Promise<boolean> {
  const cwd = process.cwd();
  logger.info(`Starting delta update from ${serverUrl} (channel: ${channel})`, 'UpdateHelper');
  
  try {
    logStep(1, 'Step 1 — 🔍  Fetching release manifest', 1000, onProgress);
    const res = await fetch(`${serverUrl}/api/builds?channel=${channel}`);
    if (!res.ok) throw new Error(`Failed to fetch builds manifest: ${res.statusText}`);
    const data = await res.json() as any;
    const builds = data?.builds || [];
    if (!builds.length) throw new Error('No release builds available on channel');
    
    const latestBuild = builds[0];
    const latestVersion = latestBuild.version || data.currentVersion;
    const filename = latestBuild.filename || `floofcore-v${latestVersion}.zip`;
    const downloadUrl = latestBuild.downloadUrl || `${serverUrl}/builds/${channel}/${filename}`;

    logStep(2, `Step 2 — 📥  Downloading delta package (v${latestVersion})`, 1000, onProgress);
    const zipRes = await fetch(downloadUrl);
    if (!zipRes.ok) throw new Error(`Failed to download delta package from ${downloadUrl}: ${zipRes.statusText}`);
    const zipBuf = Buffer.from(await zipRes.arrayBuffer());
    const zipPath = join(cwd, 'update.zip');
    writeFileSync(zipPath, zipBuf);

    logger.info(`Applying delta update package v${latestVersion}...`, 'UpdateHelper');
    const success = await applyBotUpdate(zipPath, latestVersion, onProgress);
    try { if (existsSync(zipPath)) rmSync(zipPath, { force: true }); } catch {}
    return success;
  } catch (err: any) {
    logger.error(`Delta update failed: ${err.message}`, 'UpdateHelper');
    return false;
  }
}