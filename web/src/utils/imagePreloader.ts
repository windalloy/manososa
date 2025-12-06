/**
 * 图片预加载工具
 * 支持可控制的预加载队列，可以暂停/恢复，并优先加载当前显示的图片
 */

// 预加载队列管理器
class PreloadQueue {
  private queue: string[] = [];
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private currentBatch: Promise<void> | null = null;

  // 暂停预加载队列
  pause(): void {
    this.isPaused = true;
  }

  // 恢复预加载队列
  resume(): void {
    this.isPaused = false;
    if (!this.isRunning && this.queue.length > 0) {
      this.processQueue();
    }
  }

  // 添加图片到队列
  add(images: string[]): void {
    this.queue.push(...images);
    if (!this.isRunning && !this.isPaused) {
      this.processQueue();
    }
  }

  // 处理队列
  private async processQueue(): Promise<void> {
    if (this.isRunning || this.isPaused) return;
    
    this.isRunning = true;
    const batchSize = 3;

    while (this.queue.length > 0 && !this.isPaused) {
      const batch = this.queue.splice(0, batchSize);
      this.currentBatch = Promise.allSettled(
        batch.map(src => preloadImage(src).catch(() => {}))
      ).then(() => {});

      await this.currentBatch;
      
      // 每批之间稍作延迟，避免阻塞主线程
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    this.isRunning = false;
    this.currentBatch = null;
  }

  // 清空队列
  clear(): void {
    this.queue = [];
  }
}

// 全局预加载队列实例
const preloadQueue = new PreloadQueue();

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

// 使用 link preload 预加载关键图片（最高优先级）
function preloadCriticalImages(images: string[]): void {
  images.slice(0, 10).forEach(src => {
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
 * 优先加载图片（立即加载，暂停预加载队列）
 * @param images 需要优先加载的图片路径数组
 */
export async function preloadPriorityImages(images: string[]): Promise<void> {
  // 暂停预加载队列
  preloadQueue.pause();

  // 立即加载优先图片
  await Promise.allSettled(
    images.map(src => preloadImage(src).catch(() => {}))
  );

  // 恢复预加载队列
  preloadQueue.resume();
}

/**
 * 预加载所有图片（按优先级，使用队列系统）
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

  // 将图片添加到队列（按优先级顺序）
  // 立绘图片优先
  preloadQueue.add(standImages);
  
  // 延迟后添加背景图片
  setTimeout(() => {
    preloadQueue.add(bgImages);
  }, 200);
  
  // 再延迟后添加其他图片
  setTimeout(() => {
    preloadQueue.add(otherImages);
  }, 500);
}

/**
 * 预加载单个图片（立即加载）
 */
export function preloadSingleImage(src: string): Promise<void> {
  return preloadImage(src);
}

/**
 * 暂停预加载队列
 */
export function pausePreloadQueue(): void {
  preloadQueue.pause();
}

/**
 * 恢复预加载队列
 */
export function resumePreloadQueue(): void {
  preloadQueue.resume();
}

/**
 * 清空预加载队列
 */
export function clearPreloadQueue(): void {
  preloadQueue.clear();
}
