import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as ftp from 'basic-ftp';

export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Get filename from query param (raw binary body, no FormData)
        const filename = req.nextUrl.searchParams.get('filename');
        if (!filename) {
            return NextResponse.json({ error: 'Missing filename query parameter' }, { status: 400 });
        }

        // Read the raw body as ArrayBuffer (bypasses FormData size limit)
        const arrayBuffer = await req.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            return NextResponse.json({ error: 'Empty file body' }, { status: 400 });
        }

        const buffer = Buffer.from(arrayBuffer);

        const localDir = '/tmp/ranking-uploads';
        // Ensure /tmp directory exists (Vercel allows writing here)
        try {
            await fs.access(localDir);
        } catch {
            await fs.mkdir(localDir, { recursive: true });
        }

        const localFilePath = path.join(localDir, filename);
        await fs.writeFile(localFilePath, buffer);

        // Upload to FTP
        const ftpClient = new ftp.Client();
        try {
            await ftpClient.access({
                host: process.env.FTP_HOST || '103.214.6.202',
                user: process.env.FTP_USER || 'dukowaeu',
                password: process.env.FTP_PASS || 'tTO4rf9h*ZD8!9',
                port: parseInt(process.env.FTP_PORT || '21'),
                secure: false,
            });
            const remoteDir = process.env.FTP_REMOTE_DIR || '/domains/pinkmilk.eu/public_html/RankingNW';
            await ftpClient.ensureDir(remoteDir);
            await ftpClient.uploadFrom(localFilePath, filename);
        } finally {
            ftpClient.close();
            // Clean up the temp file
            await fs.unlink(localFilePath).catch(() => { });
        }

        const baseUrl = process.env.FTP_PUBLIC_URL || 'https://www.pinkmilk.eu/RankingNW';
        const publicUrl = `${baseUrl}/${encodeURIComponent(filename)}`;

        console.log(`[FTP Upload] Uploaded ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB) → ${publicUrl}`);

        return NextResponse.json({
            success: true,
            filename,
            url: publicUrl,
            size: buffer.length,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[FTP Upload] Error:', message);
        return NextResponse.json({ error: `FTP upload failed: ${message}` }, { status: 500 });
    }
}
