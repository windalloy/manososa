/**
 * 图片预加载工具
 * 按优先级分批加载图片，优化加载性能
 */

// 预加载单个图片
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果图片已经在缓存中，直接返回
    const existingLink = document.querySelector(`link[href="${src}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    // 检查图片是否已经在浏览器缓存中
    const img = new Image();
    img.onload = () => {
      resolve();
    };
    img.onerror = () => {
      // 静默失败，不影响其他图片加载
      resolve();
    };
    img.src = src;
  });
}

// 批量预加载图片（带优先级控制）
async function preloadImagesWithPriority(
  images: string[],
  priority: 'high' | 'low' = 'low',
  batchSize: number = 3
): Promise<void> {
  // 使用 requestIdleCallback 或 setTimeout 来控制优先级
  const delay = priority === 'high' ? 0 : 100;
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    // 高优先级立即加载，低优先级延迟加载
    if (priority === 'high') {
      await Promise.allSettled(
        batch.map(src => preloadImage(src).catch(() => {}))
      );
    } else {
      await new Promise(resolve => setTimeout(resolve, delay));
      await Promise.allSettled(
        batch.map(src => preloadImage(src).catch(() => {}))
      );
    }
  }
}

// 使用 link preload 预加载关键图片（最高优先级）
function preloadCriticalImages(images: string[]): void {
  images.slice(0, 10).forEach(src => { // 限制关键图片数量，避免过多
    // 检查是否已经添加过
    if (!document.querySelector(`link[href="${src}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      // 使用 fetchPriority 设置优先级（如果浏览器支持）
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = 'high';
      }
      document.head.appendChild(link);
    }
  });
}

/**
 * 预加载所有图片（按优先级）
 * @param standImages 立绘图片路径数组（第一优先级）
 * @param bgImages 背景图片路径数组（第二优先级）
 * @param otherImages 其他图片路径数组（第三优先级）
 */
export async function preloadAllImages(
  standImages: string[],
  bgImages: string[],
  otherImages: string[] = []
): Promise<void> {
  // 第一优先级：使用 link preload 预加载当前可能用到的立绘
  // 只预加载基础立绘（不带变体的），因为它们是首先显示的
  const criticalStandImages = standImages.filter(src => 
    !src.includes('_2') && !src.includes('_3') && !src.includes('_4') && !src.includes('_l')
  );
  preloadCriticalImages(criticalStandImages);

  // 第一优先级：预加载所有立绘图片（分批，高优先级）
  await preloadImagesWithPriority(standImages, 'high', 3);

  // 第二优先级：预加载背景图片（分批，中等优先级）
  // 延迟一点，让立绘先加载
  await new Promise(resolve => setTimeout(resolve, 50));
  await preloadImagesWithPriority(bgImages, 'low', 5);

  // 第三优先级：预加载其他图片（分批，低优先级）
  if (otherImages.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    await preloadImagesWithPriority(otherImages, 'low', 5);
  }
}

/**
 * 预加载单个图片（立即加载）
 */
export function preloadSingleImage(src: string): Promise<void> {
  return preloadImage(src);
}

