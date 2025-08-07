import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const headings = await request.json();
    
    // Path to the public assets folder (served by Next.js)
    const filePath = path.join(process.cwd(), 'public', 'assets', 'fases.json');
    
    // Write the updated headings to the local assets file
    await writeFile(filePath, JSON.stringify(headings, null, 2), 'utf8');
    
    console.log('Master template updated at:', filePath);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Master template updated in local assets folder - ready for Git commit!' 
    });
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
