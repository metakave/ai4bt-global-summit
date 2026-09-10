import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = path.resolve('images/speakers');

async function run() {
  const files = fs.readdirSync(dir);
  console.log(`Found ${files.length} items in ${dir}`);
  
  let totalBefore = 0;
  let totalAfter = 0;
  let convertedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
    
    const baseName = path.basename(file, ext);
    const inputPath = path.join(dir, file);
    const outputPath = path.join(dir, `${baseName}.webp`);

    const statBefore = fs.statSync(inputPath);
    totalBefore += statBefore.size;

    // Use WebP quality 86 - visually indistinguishable from source, high fidelity
    await sharp(inputPath)
      .webp({ quality: 86, effort: 6 })
      .toFile(outputPath);

    const statAfter = fs.statSync(outputPath);
    totalAfter += statAfter.size;
    convertedCount++;

    console.log(`✓ Converted: ${file} (${(statBefore.size / 1024).toFixed(1)} KB) -> ${baseName}.webp (${(statAfter.size / 1024).toFixed(1)} KB, -${(100 - (statAfter.size / statBefore.size) * 100).toFixed(1)}%)`);
  }

  console.log(`\n========================================`);
  console.log(`Total Images Converted: ${convertedCount}`);
  console.log(`Original Total: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Optimized Total: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Savings: -${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)} MB (-${(100 - (totalAfter / totalBefore) * 100).toFixed(1)}%)`);
  console.log(`========================================\n`);
}

run().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
