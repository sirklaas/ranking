export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client as FtpClient, AccessOptions } from 'basic-ftp';
import { Readable } from 'stream';

// POST /api/save-to-isp
// Body: { data: Record<string, any>, filename?: string }
// Uploads JSON to FTP at `${FTP_REMOTE_DIR}/${filename||'fases.json'}`

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const dataObj = (body && typeof body === 'object' ? (body as Record<string, unknown>) : {}) as Record<string, unknown>;
    const jsonData = (dataObj?.data ?? body) as unknown;
    const filename = (dataObj?.filename as string) || 'fases.json';

    if (!jsonData || typeof jsonData !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
    }

    const host = process.env.FTP_HOST;
    const port = Number(process.env.FTP_PORT || 21);
    const user = process.env.FTP_USER;
    const password = process.env.FTP_PASS;
    const remoteDir = process.env.FTP_REMOTE_DIR;

    if (!host || !user || !password || !remoteDir) {
      const missing: string[] = [];
      if (!host) missing.push('FTP_HOST');
      if (!user) missing.push('FTP_USER');
      if (!password) missing.push('FTP_PASS');
      if (!remoteDir) missing.push('FTP_REMOTE_DIR');
      console.error('[save-to-isp] Missing env vars:', missing.join(', '));
      return NextResponse.json({ success: false, message: 'Missing FTP configuration', missing }, { status: 500 });
    }

    const client = new FtpClient();
    const access: AccessOptions = { host, port, user, password, secure: false };

    try {
      await client.access(access);
      await client.ensureDir(remoteDir);
      await client.cd(remoteDir);

      const jsonString = JSON.stringify(jsonData as Record<string, unknown>, null, 2);
      // Upload using a Node Readable stream for compatibility with basic-ftp
      const buffer = Buffer.from(jsonString, 'utf8');
      const stream = Readable.from(buffer);
      await client.uploadFrom(stream, filename);

      await client.close();
      return NextResponse.json({ success: true, message: `Uploaded ${filename} to ${remoteDir}` });
    } catch (e: unknown) {
      try { await client.close(); } catch {}
      const message = e instanceof Error ? e.message : 'FTP upload failed';
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
