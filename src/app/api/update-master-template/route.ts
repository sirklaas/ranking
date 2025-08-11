export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const headings = await request.json();
    
    // Check if we're in a serverless environment (like Vercel)
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      // In serverless environments, we can't write to the file system
      // Return the JSON data for manual saving or future database integration
      return NextResponse.json({ 
        success: true, 
        message: 'Running in serverless environment - file system writes not supported. Use the JSON data below for manual update.',
        data: headings,
        instructions: 'Copy this JSON data and manually update your local public/assets/fases.json file, then commit to Git.'
      });
    }
    
    // Local development - attempt to write to file
    const filePath = path.join(process.cwd(), 'public', 'assets', 'fases.json');
    
    try {
      await writeFile(filePath, JSON.stringify(headings, null, 2), 'utf8');
      console.log('Master template updated at:', filePath);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Master template updated in local assets folder - ready for Git commit!' 
      });
    } catch (writeError) {
      console.error('File write error:', writeError);
      
      // Fallback: return data for manual handling
      return NextResponse.json({ 
        success: true, 
        message: 'Could not write to file system. Please manually update the fases.json file with the data below.',
        data: headings,
        error: writeError instanceof Error ? writeError.message : 'Unknown write error'
      });
    }
    
  } catch (error) {
    console.error('Error updating master template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update master template: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
