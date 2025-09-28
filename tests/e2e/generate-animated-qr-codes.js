#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Stitch animated QR code sequences from CI-generated frames
 * CI generates individual QR frame images using marketplace actions
 * This script organizes them into animated sequences for e2e testing
 */

// Define animated sequences based on CI-generated frames
const animatedSequences = {
  'test-psbt-animated': {
    name: 'test-psbt-animated',
    description: 'Animated PSBT UR QR codes',
    frameCount: 3,
    frameRate: 2,
  },
  
  'test-account-animated': {
    name: 'test-account-animated',
    description: 'Animated Account UR QR codes',
    frameCount: 2,
    frameRate: 2,
  },
};

// Input and output directories
const framesDir = path.join(__dirname, 'qr-images', 'animated-frames');
const outputDir = path.join(__dirname, 'qr-images', 'animated-sequences');

/**
 * Create animated QR sequence from CI-generated frames
 */
async function createAnimatedSequence(sequenceConfig) {
  const { name, description, frameCount, frameRate } = sequenceConfig;
  
  console.log(`Creating animated sequence: ${name}`);
  
  // Create sequence directory
  const sequenceDir = path.join(outputDir, name);
  if (!fs.existsSync(sequenceDir)) {
    fs.mkdirSync(sequenceDir, { recursive: true });
  }
  
  // Find and organize frame files
  const frames = [];
  for (let i = 1; i <= frameCount; i++) {
    const frameNum = i.toString().padStart(3, '0');
    const frameName = name.includes('psbt') ? `psbt-frame-${frameNum}.png` : `account-frame-${frameNum}.png`;
    const framePath = path.join(framesDir, frameName);
    
    if (fs.existsSync(framePath)) {
      // Copy frame to sequence directory
      const destPath = path.join(sequenceDir, `frame_${frameNum}.png`);
      fs.copyFileSync(framePath, destPath);
      
      frames.push({
        frame: i - 1,
        filename: `frame_${frameNum}.png`,
        path: destPath,
      });
      
      console.log(`Added frame ${i}/${frameCount} for ${name}: ${frameName}`);
    } else {
      console.warn(`Frame not found: ${framePath}`);
    }
  }
  
  // Create sequence metadata
  const metadata = {
    name,
    description,
    totalFrames: frames.length,
    frameRate,
    frames,
    generated: new Date().toISOString(),
    source: 'CI-generated frames stitched by Node.js',
  };
  
  fs.writeFileSync(path.join(sequenceDir, 'sequence.json'), JSON.stringify(metadata, null, 2));
  
  console.log(`Created animated sequence: ${name} (${frames.length} frames)`);
  return metadata;
}

/**
 * Main function to generate all animated QR sequences
 */
async function generateAnimatedQRSequences() {
  console.log('Stitching animated QR code sequences from CI-generated frames...');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if frames directory exists
  if (!fs.existsSync(framesDir)) {
    console.warn('Animated frames directory not found. CI should have generated frames.');
    console.warn('Expected directory:', framesDir);
    return;
  }
  
  // List available frames
  const availableFrames = fs.readdirSync(framesDir).filter(f => f.endsWith('.png'));
  console.log('Available frames:', availableFrames);
  
  // Generate each animated sequence
  const results = [];
  for (const [key, config] of Object.entries(animatedSequences)) {
    try {
      const result = await createAnimatedSequence(config);
      results.push(result);
    } catch (error) {
      console.error(`Failed to create sequence ${config.name}:`, error);
    }
  }
  
  console.log('Animated QR sequence generation complete!');
  console.log(`Generated ${results.length} animated sequences`);
  
  return results;
}

// Run the script
if (require.main === module) {
  generateAnimatedQRSequences().catch(console.error);
}

module.exports = { generateAnimatedQRSequences, animatedSequences };
