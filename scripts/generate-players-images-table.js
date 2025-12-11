const PocketBase = require('pocketbase').default;
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// PocketBase connection
const pb = new PocketBase('https://pinkmilk.pockethost.io');

// Table dimensions - 5 wide x 8 high, 16:9 cells, same canvas width
const COLS = 5;
const ROWS = 8;
const CELL_WIDTH = 380;  // 16:9 aspect ratio, bigger for 5 columns
const CELL_HEIGHT = 214;
const PADDING = 15;
const GAP = 10;
const CANVAS_WIDTH = COLS * CELL_WIDTH + (COLS - 1) * GAP + PADDING * 2;
const CANVAS_HEIGHT = ROWS * CELL_HEIGHT + (ROWS - 1) * GAP + PADDING * 2;

// Download image from URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

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
      id: r.id,
      collectionId: r.collectionId
    }));
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

function getImageUrl(player) {
  // PocketBase file URL format
  return `https://pinkmilk.pockethost.io/api/files/${player.collectionId}/${player.id}/${player.image}`;
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
  
  // Load and draw each player image
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      if (index >= players.length) break;
      
      const player = players[index];
      const x = PADDING + col * (CELL_WIDTH + GAP);
      const y = PADDING + row * (CELL_HEIGHT + GAP);
      
      // Draw cell background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      const radius = 12;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + CELL_WIDTH - radius, y);
      ctx.quadraticCurveTo(x + CELL_WIDTH, y, x + CELL_WIDTH, y + radius);
      ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT - radius);
      ctx.quadraticCurveTo(x + CELL_WIDTH, y + CELL_HEIGHT, x + CELL_WIDTH - radius, y + CELL_HEIGHT);
      ctx.lineTo(x + radius, y + CELL_HEIGHT);
      ctx.quadraticCurveTo(x, y + CELL_HEIGHT, x, y + CELL_HEIGHT - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      
      // Try to load and draw the image
      try {
        const imageUrl = getImageUrl(player);
        console.log(`Loading image for ${player.name}...`);
        const imageBuffer = await downloadImage(imageUrl);
        const img = await loadImage(imageBuffer);
        
        // Save context for clipping
        ctx.save();
        
        // Create rounded clipping path
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + CELL_WIDTH - radius, y);
        ctx.quadraticCurveTo(x + CELL_WIDTH, y, x + CELL_WIDTH, y + radius);
        ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT - radius);
        ctx.quadraticCurveTo(x + CELL_WIDTH, y + CELL_HEIGHT, x + CELL_WIDTH - radius, y + CELL_HEIGHT);
        ctx.lineTo(x + radius, y + CELL_HEIGHT);
        ctx.quadraticCurveTo(x, y + CELL_HEIGHT, x, y + CELL_HEIGHT - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        
        // Draw image to cover the cell (crop to fit)
        const scale = Math.max(CELL_WIDTH / img.width, CELL_HEIGHT / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (CELL_WIDTH - scaledWidth) / 2;
        const offsetY = (CELL_HEIGHT - scaledHeight) / 2;
        
        ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
        
        ctx.restore();
      } catch (err) {
        console.log(`  Could not load image for ${player.name}: ${err.message}`);
      }
      
      // Draw name overlay at bottom
      const nameBoxHeight = 44;
      const nameY = y + CELL_HEIGHT - nameBoxHeight;
      
      // Gradient overlay for text readability
      const textGradient = ctx.createLinearGradient(x, nameY - 20, x, y + CELL_HEIGHT);
      textGradient.addColorStop(0, 'rgba(10, 23, 82, 0)');
      textGradient.addColorStop(0.3, 'rgba(10, 23, 82, 0.7)');
      textGradient.addColorStop(1, 'rgba(10, 23, 82, 0.95)');
      ctx.fillStyle = textGradient;
      
      // Draw gradient overlay with rounded bottom corners
      ctx.beginPath();
      ctx.moveTo(x, nameY - 20);
      ctx.lineTo(x + CELL_WIDTH, nameY - 20);
      ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT - radius);
      ctx.quadraticCurveTo(x + CELL_WIDTH, y + CELL_HEIGHT, x + CELL_WIDTH - radius, y + CELL_HEIGHT);
      ctx.lineTo(x + radius, y + CELL_HEIGHT);
      ctx.quadraticCurveTo(x, y + CELL_HEIGHT, x, y + CELL_HEIGHT - radius);
      ctx.closePath();
      ctx.fill();
      
      // Draw player name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 18px "Barlow Semi Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Text shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      const textX = x + CELL_WIDTH / 2;
      const textY = y + CELL_HEIGHT - nameBoxHeight / 2 - 2;
      ctx.fillText(player.name, textX, textY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + CELL_WIDTH - radius, y);
      ctx.quadraticCurveTo(x + CELL_WIDTH, y, x + CELL_WIDTH, y + radius);
      ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT - radius);
      ctx.quadraticCurveTo(x + CELL_WIDTH, y + CELL_HEIGHT, x + CELL_WIDTH - radius, y + CELL_HEIGHT);
      ctx.lineTo(x + radius, y + CELL_HEIGHT);
      ctx.quadraticCurveTo(x, y + CELL_HEIGHT, x, y + CELL_HEIGHT - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'public', 'players-images-table.png');
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
    
    console.log(`\nGenerating image table with ${Math.min(players.length, 40)} players...`);
    
    await generateTable(players.slice(0, 40));
  } catch (error) {
    console.error('Failed to generate table:', error);
  }
}

main();
