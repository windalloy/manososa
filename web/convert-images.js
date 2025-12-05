const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'src', 'assets');

// 递归获取所有图片文件
function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else if (/\.(png|jpg|jpeg)$/i.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 转换单个图片
async function convertImage(inputPath, outputFormat) {
  try {
    const ext = outputFormat === 'avif' ? '.avif' : '.webp';
    const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, ext);
    
    // 如果输出文件已存在，跳过
    if (fs.existsSync(outputPath)) {
      console.log(`跳过（已存在）: ${path.relative(assetsDir, outputPath)}`);
      return { success: true, skipped: true, inputPath, outputPath };
    }
    
    const inputBuffer = fs.readFileSync(inputPath);
    let outputBuffer;
    
    if (outputFormat === 'avif') {
      outputBuffer = await sharp(inputBuffer)
        .avif({ quality: 80, effort: 4 })
        .toBuffer();
    } else {
      outputBuffer = await sharp(inputBuffer)
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
    }
    
    fs.writeFileSync(outputPath, outputBuffer);
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = outputBuffer.length;
    const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);
    
    console.log(`✓ ${path.relative(assetsDir, inputPath)} → ${path.relative(assetsDir, outputPath)} (${(inputSize / 1024).toFixed(1)}KB → ${(outputSize / 1024).toFixed(1)}KB, 减少 ${reduction}%)`);
    
    return { success: true, skipped: false, inputPath, outputPath, inputSize, outputSize };
  } catch (error) {
    console.error(`✗ 转换失败: ${path.relative(assetsDir, inputPath)} - ${error.message}`);
    return { success: false, inputPath, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('开始转换图片...\n');
  
  const allImages = getAllImageFiles(assetsDir);
  console.log(`找到 ${allImages.length} 张图片\n`);
  
  const bgImages = [];
  const otherImages = [];
  
  // 分类图片
  allImages.forEach(imagePath => {
    const relativePath = path.relative(assetsDir, imagePath);
    if (relativePath.startsWith('bg' + path.sep) && /^\d{2}\.(png|jpg|jpeg)$/i.test(path.basename(imagePath))) {
      bgImages.push(imagePath);
    } else {
      otherImages.push(imagePath);
    }
  });
  
  console.log(`背景图片 (bg/01.png - bg/48.png): ${bgImages.length} 张 → AVIF 格式`);
  console.log(`其他图片: ${otherImages.length} 张 → WebP 格式\n`);
  
  // 转换背景图片为 AVIF
  console.log('=== 转换背景图片为 AVIF ===');
  const bgResults = [];
  for (const imagePath of bgImages) {
    const result = await convertImage(imagePath, 'avif');
    bgResults.push(result);
  }
  
  // 转换其他图片为 WebP
  console.log('\n=== 转换其他图片为 WebP ===');
  const otherResults = [];
  for (const imagePath of otherImages) {
    const result = await convertImage(imagePath, 'webp');
    otherResults.push(result);
  }
  
  // 统计
  console.log('\n=== 转换完成 ===');
  const allResults = [...bgResults, ...otherResults];
  const successCount = allResults.filter(r => r.success && !r.skipped).length;
  const skippedCount = allResults.filter(r => r.skipped).length;
  const failedCount = allResults.filter(r => !r.success).length;
  
  console.log(`成功: ${successCount} 张`);
  console.log(`跳过: ${skippedCount} 张`);
  console.log(`失败: ${failedCount} 张`);
  
  if (successCount > 0) {
    const totalInputSize = allResults
      .filter(r => r.success && r.inputSize)
      .reduce((sum, r) => sum + r.inputSize, 0);
    const totalOutputSize = allResults
      .filter(r => r.success && r.outputSize)
      .reduce((sum, r) => sum + r.outputSize, 0);
    const totalReduction = ((1 - totalOutputSize / totalInputSize) * 100).toFixed(1);
    
    console.log(`\n总大小: ${(totalInputSize / 1024 / 1024).toFixed(2)}MB → ${(totalOutputSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`总体积减少: ${totalReduction}%`);
  }
}

main().catch(console.error);

