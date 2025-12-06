const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'src', 'assets');

// 压缩配置选项
const COMPRESSION_PROFILES = {
  // 高质量（当前设置）- 质量优先，体积较大
  high: {
    avif: { quality: 80, effort: 4 },
    webp: { quality: 80, effort: 4 }
  },
  // 平衡（推荐）- 质量与体积的平衡
  balanced: {
    avif: { quality: 70, effort: 6 },  // 背景图片可以更低
    webp: { quality: 75, effort: 6 }   // 立绘等需要细节的保持稍高
  },
  // 高压缩 - 体积优先，质量略有下降
  aggressive: {
    avif: { quality: 60, effort: 7 },  // 背景图片可以更低
    webp: { quality: 70, effort: 7 }    // 立绘等保持可接受质量
  },
  // 自定义：针对不同图片类型使用不同质量
  custom: {
    // 背景图片（可以更低质量，因为通常不需要太多细节）
    bg: {
      avif: { quality: 65, effort: 6 }
    },
    // 立绘图片（需要保持细节）
    stand: {
      webp: { quality: 75, effort: 6 }
    },
    // 证物图片（中等质量）
    evidence: {
      webp: { quality: 72, effort: 6 }
    },
    // UI 图片（可以较低质量）
    ui: {
      webp: { quality: 70, effort: 6 }
    },
    // 其他图片（默认）
    other: {
      webp: { quality: 72, effort: 6 }
    }
  }
};

// 从命令行参数获取压缩配置，默认为 'balanced'
const profile = process.argv[2] || 'balanced';
const config = COMPRESSION_PROFILES[profile] || COMPRESSION_PROFILES.balanced;

console.log(`使用压缩配置: ${profile}`);
if (profile === 'custom') {
  console.log('  背景图片 (AVIF): quality=65, effort=6');
  console.log('  立绘图片 (WebP): quality=75, effort=6');
  console.log('  证物图片 (WebP): quality=72, effort=6');
  console.log('  UI 图片 (WebP): quality=70, effort=6');
  console.log('  其他图片 (WebP): quality=72, effort=6');
} else {
  console.log(`  AVIF: quality=${config.avif.quality}, effort=${config.avif.effort}`);
  console.log(`  WebP: quality=${config.webp.quality}, effort=${config.webp.effort}`);
}
console.log('');

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
async function convertImage(inputPath, outputFormat, customConfig = null) {
  try {
    const ext = outputFormat === 'avif' ? '.avif' : '.webp';
    const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, ext);
    
    // 如果输出文件已存在，强制覆盖重新转换（以便测试不同质量）
    if (fs.existsSync(outputPath)) {
      console.log(`覆盖: ${path.relative(assetsDir, outputPath)}`);
    }
    
    const inputBuffer = fs.readFileSync(inputPath);
    let outputBuffer;
    
    // 使用自定义配置或默认配置
    const compressionConfig = customConfig || (outputFormat === 'avif' ? config.avif : config.webp);
    
    if (outputFormat === 'avif') {
      outputBuffer = await sharp(inputBuffer)
        .avif(compressionConfig)
        .toBuffer();
    } else {
      outputBuffer = await sharp(inputBuffer)
        .webp({
          ...compressionConfig,
          // WebP 额外优化选项
          smartSubsample: true,  // 智能子采样，可以进一步优化
          nearLossless: false,  // 不使用接近无损模式（体积更小）
        })
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
  console.log('开始转换图片（优化版）...\n');
  
  const allImages = getAllImageFiles(assetsDir);
  console.log(`找到 ${allImages.length} 张图片\n`);
  
  const bgImages = [];
  const standImages = [];
  const evidenceImages = [];
  const uiImages = [];
  const otherImages = [];
  
  // 分类图片
  allImages.forEach(imagePath => {
    const relativePath = path.relative(assetsDir, imagePath);
    const dir = path.dirname(relativePath);
    const fileName = path.basename(relativePath);
    
    if (relativePath.startsWith('bg' + path.sep) && /^\d{2}\.(png|jpg|jpeg)$/i.test(fileName)) {
      bgImages.push(imagePath);
    } else if (relativePath.startsWith('character_stand' + path.sep)) {
      standImages.push(imagePath);
    } else if (relativePath.startsWith('evidence' + path.sep) && /^\d{2}\.(png|jpg|jpeg)$/i.test(fileName)) {
      evidenceImages.push(imagePath);
    } else if (relativePath.startsWith('ui' + path.sep)) {
      uiImages.push(imagePath);
    } else {
      otherImages.push(imagePath);
    }
  });
  
  console.log(`背景图片: ${bgImages.length} 张 → AVIF 格式`);
  console.log(`立绘图片: ${standImages.length} 张 → WebP 格式`);
  console.log(`证物图片: ${evidenceImages.length} 张 → WebP 格式`);
  console.log(`UI 图片: ${uiImages.length} 张 → WebP 格式`);
  console.log(`其他图片: ${otherImages.length} 张 → WebP 格式\n`);
  
  const allResults = [];
  
  // 转换背景图片为 AVIF
  if (bgImages.length > 0) {
    console.log('=== 转换背景图片为 AVIF ===');
    for (const imagePath of bgImages) {
      const customConfig = profile === 'custom' ? COMPRESSION_PROFILES.custom.bg.avif : null;
      const result = await convertImage(imagePath, 'avif', customConfig);
      allResults.push(result);
    }
  }
  
  // 转换立绘图片为 WebP
  if (standImages.length > 0) {
    console.log('\n=== 转换立绘图片为 WebP ===');
    for (const imagePath of standImages) {
      const customConfig = profile === 'custom' ? COMPRESSION_PROFILES.custom.stand.webp : null;
      const result = await convertImage(imagePath, 'webp', customConfig);
      allResults.push(result);
    }
  }
  
  // 转换证物图片为 WebP
  if (evidenceImages.length > 0) {
    console.log('\n=== 转换证物图片为 WebP ===');
    for (const imagePath of evidenceImages) {
      const customConfig = profile === 'custom' ? COMPRESSION_PROFILES.custom.evidence.webp : null;
      const result = await convertImage(imagePath, 'webp', customConfig);
      allResults.push(result);
    }
  }
  
  // 转换 UI 图片为 WebP
  if (uiImages.length > 0) {
    console.log('\n=== 转换 UI 图片为 WebP ===');
    for (const imagePath of uiImages) {
      const customConfig = profile === 'custom' ? COMPRESSION_PROFILES.custom.ui.webp : null;
      const result = await convertImage(imagePath, 'webp', customConfig);
      allResults.push(result);
    }
  }
  
  // 转换其他图片为 WebP
  if (otherImages.length > 0) {
    console.log('\n=== 转换其他图片为 WebP ===');
    for (const imagePath of otherImages) {
      const customConfig = profile === 'custom' ? COMPRESSION_PROFILES.custom.other.webp : null;
      const result = await convertImage(imagePath, 'webp', customConfig);
      allResults.push(result);
    }
  }
  
  // 统计
  console.log('\n=== 转换完成 ===');
  const successCount = allResults.filter(r => r.success && !r.skipped).length;
  const failedCount = allResults.filter(r => !r.success).length;
  
  console.log(`成功: ${successCount} 张`);
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
    console.log(`节省空间: ${((totalInputSize - totalOutputSize) / 1024 / 1024).toFixed(2)}MB`);
  }
  
  console.log('\n提示: 建议在转换后检查图片质量，如果质量不满意，可以调整 quality 参数重新转换。');
  console.log('使用方法: node convert-images-optimized.js [high|balanced|aggressive|custom]');
}

main().catch(console.error);

