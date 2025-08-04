import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const headings = await request.json();
    
    // Path to the master template file
    const filePath = path.join(process.cwd(), 'assets', 'fases.json');
    
    // Write the updated headings to the file
    await writeFile(filePath, JSON.stringify(headings, null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Master template updated successfully' 
    });
  } catch (error) {
    console.error('Error updating master template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update master template' 
      },
      { status: 500 }
    );
  }
}
