import { NextRequest, NextResponse } from 'next/server';
import { Client as FtpClient, AccessOptions } from 'basic-ftp';

// POST /api/save-to-isp
// Body: { data: Record<string, any>, filename?: string }
// Uploads JSON to FTP at `${FTP_REMOTE_DIR}/${filename||'fases.json'}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jsonData = body?.data ?? body;
    const filename = (body?.filename || 'fases.json') as string;

    if (!jsonData || typeof jsonData !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
    }

    const host = process.env.FTP_HOST;
    const port = Number(process.env.FTP_PORT || 21);
    const user = process.env.FTP_USER;
    const password = process.env.FTP_PASS;
    const remoteDir = process.env.FTP_REMOTE_DIR;

    if (!host || !user || !password || !remoteDir) {
      return NextResponse.json({
        success: false,
        message: 'Missing FTP configuration. Please set FTP_HOST, FTP_USER, FTP_PASS, FTP_REMOTE_DIR (and optional FTP_PORT).'
      }, { status: 500 });
    }

    const client = new FtpClient();
    const access: AccessOptions = { host, port, user, password, secure: false }; // plain FTP per user request

    try {
      await client.access(access);
      await client.ensureDir(remoteDir);
      await client.cd(remoteDir);

      const jsonString = JSON.stringify(jsonData, null, 2);
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(jsonString));
          controller.close();
        }
      });

      // basic-ftp accepts a WHATWG ReadableStream via uploadFrom if wrapped; use a temporary buffer instead for compatibility
      const buffer = Buffer.from(jsonString, 'utf8');
      await client.uploadFrom(buffer, filename);

      await client.close();
      return NextResponse.json({ success: true, message: `Uploaded ${filename} to ${remoteDir}` });
    } catch (e: any) {
      try { await client.close(); } catch {}
      return NextResponse.json({ success: false, message: e?.message || 'FTP upload failed' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
