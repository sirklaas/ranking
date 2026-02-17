import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'basic-ftp';
import { Readable } from 'stream';

const FTP_HOST = process.env.FTP_HOST || '103.214.6.202';
const FTP_USER = process.env.FTP_USER || 'dukowaeu';
const FTP_PASS = process.env.FTP_PASS || 'tTO4rf9h*ZD8!9';
const FTP_PORT = parseInt(process.env.FTP_PORT || '21', 10);
const FTP_REMOTE_DIR = process.env.FTP_REMOTE_DIR || '/domains/pinkmilk.eu/public_html/RankingNW';
const PUBLIC_BASE_URL = process.env.FTP_PUBLIC_URL || 'https://www.pinkmilk.eu/RankingNW';

export async function POST(req: NextRequest) {
    const client = new Client();
    client.ftp.verbose = false;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const filename = (formData.get('filename') as string) || file?.name;

        if (!file || !filename) {
            return NextResponse.json({ error: 'Missing file or filename' }, { status: 400 });
        }

        // Convert File to Buffer -> Readable stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // Connect to FTP
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            port: FTP_PORT,
            secure: false,
        });

        // Navigate to the target directory
        await client.ensureDir(FTP_REMOTE_DIR);

        // Upload
        await client.uploadFrom(stream, filename);

        const publicUrl = `${PUBLIC_BASE_URL}/${encodeURIComponent(filename)}`;
        console.log(`[FTP Upload] Uploaded ${filename} → ${publicUrl}`);

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
    } finally {
        client.close();
    }
}
