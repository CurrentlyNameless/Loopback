import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import { Logger } from './logger.ts';
import { DatabaseManager } from '../managers/DatabaseManager.ts';

export interface BackupPayload {
  configYml: string;
  modules: Record<string, any>;
}

const BACKUP_EXCLUDES = ['node_modules', '.bun', '.git', 'backups', 'dist', '.update-in-progress', 'update.zip'];

export class BackupManager {
  /**
   * Creates a cross-platform POSIX-compliant zip archive (using forward slashes '/')
   * Ensures seamless extraction in Linux, Docker, and Pterodactyl containers.
   */
  static async createZipBackup(outPath: string): Promise<string> {
    const cwd = process.cwd();
    const parent = join(outPath, '..');
    mkdirSync(parent, { recursive: true });

    if (existsSync(outPath)) rmSync(outPath, { force: true });

    const zip = new JSZip();

    function addDirectoryToZip(dirPath: string, relativeDir: string = '') {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        if (!relativeDir && BACKUP_EXCLUDES.includes(entry)) continue;

        const fullPath = join(dirPath, entry);
        const zipEntryPath = relativeDir ? `${relativeDir}/${entry}` : entry;

        try {
          const stat = statSync(fullPath);
          const cleanPath = zipEntryPath.replace(/\\/g, '/');
          if (stat.isDirectory()) {
            zip.folder(cleanPath);
            addDirectoryToZip(fullPath, zipEntryPath);
          } else {
            const data = readFileSync(fullPath);
            // Force 644 UNIX permissions so extraction on Linux doesn't map DOS read-only attributes
            zip.file(cleanPath, data, { unixPermissions: '644' });
          }
        } catch (err: any) {
          Logger.warn(`Skipped locked/inaccessible file ${entry}: ${err.message}`, 'BackupManager');
        }
      }
    }

    addDirectoryToZip(cwd);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      platform: 'UNIX',
    });

    writeFileSync(outPath, buffer);
    Logger.info(`Generated POSIX-compliant zip archive at ${outPath} (${buffer.length} bytes)`, 'BackupManager');
    return outPath;
  }

  /**
   * Uploads a zip file to the FLM server's backup upload endpoint.
   */
  static async uploadZip(zipPath: string, serverUrl: string, licenseKey: string, guildId: string, guildName: string, label: string, isAuto: boolean): Promise<{ backupId: string; downloadUrl: string }> {
    const zipBuffer = readFileSync(zipPath);
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('zip', zipBlob, 'backup.zip');
    formData.append('licenseKey', licenseKey);
    formData.append('guildId', guildId);
    formData.append('guildName', guildName);
    formData.append('label', label);
    formData.append('isAuto', String(isAuto));

    const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/backups/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Backup upload failed (${response.status}): ${err}`);
    }

    const result = await response.json();
    return { backupId: result.backupId, downloadUrl: result.downloadUrl };
  }

  /**
   * Downloads a zip backup from the FLM server and extracts it over cwd.
   */
  static async downloadAndExtractZip(downloadUrl: string, licenseKey: string): Promise<void> {
    const cwd = process.cwd();
    const headers: Record<string, string> = {};
    if (licenseKey) headers['x-license-key'] = licenseKey;

    const res = await fetch(downloadUrl, { headers });
    if (!res.ok) throw new Error(`Failed to download backup: ${res.statusText}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const cleanPath = relativePath.replace(/\\/g, '/');
      const outFilePath = join(cwd, cleanPath);
      const outDir = join(outFilePath, '..');
      mkdirSync(outDir, { recursive: true });
      const content = await file.async('nodebuffer');
      writeFileSync(outFilePath, content);
    }
  }

  /**
   * Exports all module configurations from Mongo into a serializable payload.
   */
  static async exportMongoData(): Promise<Record<string, any>> {
    const db = DatabaseManager.getDatabase();
    if (!db || !db.isInitialized()) return {};

    const modules: Record<string, any> = {};
    const nativeDb = mongoose.connection.db;
    if (!nativeDb) return {};

    const collections = await nativeDb.listCollections().toArray();
    for (const col of collections) {
      if (col.name.startsWith('system.')) continue;
      const docs = await nativeDb.collection(col.name).find({}).toArray();
      if (docs.length > 0) {
        modules[col.name] = docs.map((doc: any) => {
          const clean = { ...doc };
          if (clean._id) clean._id = clean._id.toString();
          return clean;
        });
      }
    }

    return modules;
  }

  /**
   * Imports module data into Mongo, clearing existing collections first.
   */
  static async importMongoData(modules: Record<string, any>): Promise<{ success: boolean; errors: string[] }> {
    const db = DatabaseManager.getDatabase();
    if (!db || !db.isInitialized()) {
      return { success: false, errors: ['Database not connected'] };
    }

    const nativeDb = mongoose.connection.db;
    if (!nativeDb) {
      return { success: false, errors: ['No native database handle'] };
    }

    const errors: string[] = [];

    for (const [moduleKey, docs] of Object.entries(modules)) {
      try {
        if (!Array.isArray(docs) || docs.length === 0) continue;

        const collection = nativeDb.collection(moduleKey);
        await collection.deleteMany({});

        const cleanDocs = docs.map((doc: any) => {
          const clean = { ...doc };
          if (clean._id && typeof clean._id === 'string' && mongoose.Types.ObjectId.isValid(clean._id)) {
            clean._id = new mongoose.Types.ObjectId(clean._id);
          }
          return clean;
        });

        await collection.insertMany(cleanDocs);
        Logger.info(`Restored ${cleanDocs.length} documents for ${moduleKey}`, 'BackupManager');
      } catch (err: any) {
        Logger.error(`Failed to import data for ${moduleKey}: ${err.message}`, 'BackupManager');
        errors.push(`${moduleKey}: ${err.message}`);
      }
    }

    return { success: errors.length === 0, errors };
  }
}
