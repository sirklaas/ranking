export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// Simple API to read/write the local motherfile in development
// In serverless/prod, PUT will return a notice that FS writes are not supported

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'fases.json');
    const data = await readFile(filePath, 'utf8');
    const json = JSON.parse(data || '{}');
    return NextResponse.json({ success: true, data: json });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to read motherfile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Detect serverless
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (isServerless) {
      return NextResponse.json({
        success: true,
        message: 'Serverless environment: cannot write to filesystem. Use the returned JSON to update the motherfile manually or store in PocketBase.',
        data: body
      });
    }

    const filePath = path.join(process.cwd(), 'public', 'assets', 'fases.json');
    await writeFile(filePath, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true, message: 'Motherfile updated at public/assets/fases.json' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to write motherfile' },
      { status: 500 }
    );
  }
}
