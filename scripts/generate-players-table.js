const PocketBase = require('pocketbase').default;
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');

// PocketBase connection
const pb = new PocketBase('https://pinkmilk.pockethost.io');

// Table dimensions - 5 wide x 8 high for bigger names
const COLS = 5;
const ROWS = 8;
const CELL_WIDTH = 280;
const CELL_HEIGHT = 70;
const PADDING = 20;
const CANVAS_WIDTH = COLS * CELL_WIDTH + PADDING * 2;
const CANVAS_HEIGHT = ROWS * CELL_HEIGHT + PADDING * 2;

async function fetchPlayersWithImages() {
  try {
    console.log('Fetching players from MEQuestions collection...');
    const records = await pb.collection('MEQuestions').getFullList({
      sort: 'nameplayer',
    });
    
    // Filter only records that have an image
    const playersWithImages = records.filter(r => r.image && r.nameplayer);
    console.log(`Found ${playersWithImages.length} players with images`);
    
    return playersWithImages.map(r => ({
      name: r.nameplayer,
      image: r.image,
      id: r.id
    }));
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

async function generateTable(players) {
  // Create canvas
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');
  
  // Background - dark gradient
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#0A1752');
  gradient.addColorStop(1, '#1a237e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Add subtle pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < CANVAS_WIDTH; i += 40) {
    for (let j = 0; j < CANVAS_HEIGHT; j += 40) {
      ctx.beginPath();
      ctx.arc(i, j, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Set font - Barlow Semi Condensed 400 (larger for 5x8 layout)
  ctx.font = '400 24px "Barlow Semi Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw cells
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      if (index >= players.length) break;
      
      const x = PADDING + col * CELL_WIDTH;
      const y = PADDING + row * CELL_HEIGHT;
      
      // Cell background with subtle gradient
      const cellGradient = ctx.createLinearGradient(x, y, x, y + CELL_HEIGHT);
      cellGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      cellGradient.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      ctx.fillStyle = cellGradient;
      
      // Rounded rectangle
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(x + radius, y + 4);
      ctx.lineTo(x + CELL_WIDTH - 8 - radius, y + 4);
      ctx.quadraticCurveTo(x + CELL_WIDTH - 8, y + 4, x + CELL_WIDTH - 8, y + 4 + radius);
      ctx.lineTo(x + CELL_WIDTH - 8, y + CELL_HEIGHT - 4 - radius);
      ctx.quadraticCurveTo(x + CELL_WIDTH - 8, y + CELL_HEIGHT - 4, x + CELL_WIDTH - 8 - radius, y + CELL_HEIGHT - 4);
      ctx.lineTo(x + radius, y + CELL_HEIGHT - 4);
      ctx.quadraticCurveTo(x, y + CELL_HEIGHT - 4, x, y + CELL_HEIGHT - 4 - radius);
      ctx.lineTo(x, y + 4 + radius);
      ctx.quadraticCurveTo(x, y + 4, x + radius, y + 4);
      ctx.closePath();
      ctx.fill();
      
      // Border glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Player name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '400 22px "Barlow Semi Condensed", sans-serif';
      
      const playerName = players[index].name;
      const centerX = x + CELL_WIDTH / 2 - 4;
      const centerY = y + CELL_HEIGHT / 2;
      
      // Add text shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.fillText(playerName, centerX, centerY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }
  
  // Add decorative border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'public', 'players-table.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✅ Table saved to: ${outputPath}`);
  
  return outputPath;
}

async function main() {
  try {
    const players = await fetchPlayersWithImages();
    
    if (players.length === 0) {
      console.log('No players with images found!');
      return;
    }
    
    console.log(`\nGenerating table with ${Math.min(players.length, 40)} players...`);
    console.log('Players:', players.slice(0, 40).map(p => p.name).join(', '));
    
    await generateTable(players.slice(0, 40));
  } catch (error) {
    console.error('Failed to generate table:', error);
  }
}

main();
