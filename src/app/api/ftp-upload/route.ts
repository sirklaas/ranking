import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

        const localDir = path.join(process.cwd(), 'pics');
        // Ensure directory exists
        try {
            await fs.access(localDir);
        } catch {
            await fs.mkdir(localDir, { recursive: true });
        }

        const localFilePath = path.join(localDir, filename);

        // Upload (Write locally)
        await fs.writeFile(localFilePath, buffer);

        const publicUrl = `/pics/${encodeURIComponent(filename)}`;
        console.log(`[Local Upload] Uploaded ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB) → ${publicUrl}`);

        return NextResponse.json({
            success: true,
            filename,
            url: publicUrl,
            size: buffer.length,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Local Upload] Error:', message);
        return NextResponse.json({ error: `Local upload failed: ${message}` }, { status: 500 });
    }
}
