import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB limit for high-res images, GIFs, and MP3 tracks
const MIME_EXTENSIONS: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/pjpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/aac': '.aac',
    'audio/flac': '.flac',
    'audio/m4a': '.m4a',
    'audio/x-m4a': '.m4a',
};

export default function uploadRoutes(uploadsDir: string): Router {
    const router = Router();

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    router.post('/', (req, res) => {
        const rawFileNameHeader = String(req.headers['x-file-name'] || '');
        let originalFileName = '';
        try {
            originalFileName = decodeURIComponent(rawFileNameHeader);
        } catch {
            originalFileName = rawFileNameHeader;
        }

        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        const mimeType = contentType.split(';', 1)[0].trim();
        
        let ext = '';
        if (originalFileName) {
            ext = path.extname(originalFileName).toLowerCase();
        }
        if (!ext && mimeType) {
            ext = MIME_EXTENSIONS[mimeType] || '';
        }

        const contentLength = Number(req.headers['content-length'] || 0);
        if (contentLength > MAX_UPLOAD_BYTES) {
            res.status(413).json({ success: false, error: 'Upload exceeds the 50 MB limit' });
            return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        let rejected = false;

        req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_UPLOAD_BYTES) {
                rejected = true;
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                if (rejected) {
                    res.status(413).json({ success: false, error: 'Upload exceeds the 50 MB limit' });
                    return;
                }
                let buffer = Buffer.concat(chunks);

                // Handle multipart/form-data boundary parsing if submitted via FormData
                if (contentType.includes('multipart/form-data')) {
                    const boundaryMatch = contentType.match(/boundary=(?:([^;]+)|"([^"]+)")/i);
                    const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;
                    if (boundary) {
                        const boundaryBuffer = Buffer.from(`--${boundary}`);
                        const parts = [];
                        let start = 0;
                        while (start < buffer.length) {
                            const idx = buffer.indexOf(boundaryBuffer, start);
                            if (idx === -1) break;
                            if (start > 0) parts.push(buffer.subarray(start, idx));
                            start = idx + boundaryBuffer.length;
                        }
                        for (const part of parts) {
                            const headerEnd = part.indexOf('\r\n\r\n');
                            if (headerEnd !== -1) {
                                const headerStr = part.subarray(0, headerEnd).toString('utf8');
                                const partFilename = headerStr.match(/filename="([^"]+)"/i)?.[1];
                                if (partFilename) {
                                    ext = path.extname(partFilename).toLowerCase();
                                }
                                const partMime = headerStr.match(/content-type:\s*([^;\r\n]+)/i)?.[1]?.toLowerCase();
                                if (!ext && partMime) {
                                    ext = MIME_EXTENSIONS[partMime] || '';
                                }
                                const fileData = part.subarray(headerEnd + 4, part.length - 2);
                                if (fileData.length > 0) {
                                    buffer = fileData;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (!ext || buffer.length === 0) {
                    ext = '.mp3';
                }

                const cleanBase = originalFileName
                    ? path.basename(originalFileName, path.extname(originalFileName)).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
                    : Math.random().toString(36).substring(2, 8);

                const finalFilename = `${Date.now()}_${cleanBase}${ext}`;
                const finalPath = path.join(uploadsDir, finalFilename);
                fs.writeFileSync(finalPath, buffer);

                res.json({
                    success: true,
                    url: `/uploads/${finalFilename}`,
                    filename: finalFilename,
                    size: buffer.length
                });
            } catch (err: any) {
                res.status(500).json({ success: false, error: err?.message || 'Failed to save upload' });
            }
        });

        req.on('error', (err: any) => {
            res.status(500).json({ success: false, error: err?.message || 'Upload stream error' });
        });
    });

    return router;
}
