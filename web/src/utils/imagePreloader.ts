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

  // 检查是否暂停
  getPausedState(): boolean {
    return this.isPaused;
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
 * 预加载所有图片（按新的优先级顺序）
 * @param baseStandImages 基础立绘图片路径数组（不带下划线的，如 ema.webp, hiro.webp）
 * @param bgImages 背景图片路径数组（按顺序）
 * @param otherImagesByCategory 按目录分类的其他图片
 */
export async function preloadAllImages(
  baseStandImages: string[],
  bgImages: string[],
  otherImagesByCategory: {
    map: string[];
    ui: string[];
    evidence: string[];
    character_name: string[];
    character_avatars: string[];
    history: string[];
    character_stand_variants: string[]; // 带下划线的立绘变体
  }
): Promise<void> {
  // 第二步：同时预加载所有背景（按顺序）和所有基础立绘
  // 背景按顺序加载，基础立绘同时加载，两者并行进行
  // 注意：这一步不使用队列系统，直接加载，因为它们是高优先级
  // 但 preloadPriorityImages 会暂停队列，所以如果此时队列正在运行，会被暂停
  const loadBgsAndStands = async () => {
    const bgBatchSize = 3;
    const standBatchSize = 3;
    
    // 创建两个并行的加载任务
    const bgLoader = async () => {
      // 背景按顺序加载
      for (let i = 0; i < bgImages.length; i += bgBatchSize) {
        // 检查是否被暂停（通过检查队列状态）
        if (preloadQueue.getPausedState()) {
          // 如果被暂停，等待恢复
          while (preloadQueue.getPausedState()) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        const batch = bgImages.slice(i, i + bgBatchSize);
        await Promise.allSettled(
          batch.map(src => preloadImage(src).catch(() => {}))
        );
        if (i + bgBatchSize < bgImages.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };
    
    const standLoader = async () => {
      // 基础立绘同时加载
      for (let i = 0; i < baseStandImages.length; i += standBatchSize) {
        // 检查是否被暂停
        if (preloadQueue.getPausedState()) {
          while (preloadQueue.getPausedState()) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        const batch = baseStandImages.slice(i, i + standBatchSize);
        await Promise.allSettled(
          batch.map(src => preloadImage(src).catch(() => {}))
        );
        if (i + standBatchSize < baseStandImages.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };
    
    // 同时执行背景和立绘的加载
    await Promise.all([bgLoader(), standLoader()]);
  };

  // 执行第二步
  await loadBgsAndStands();

  // 第三步：按目录顺序预加载其他图片（使用队列系统，可以被暂停）
  const categoryOrder = [
    otherImagesByCategory.map,
    otherImagesByCategory.ui,
    otherImagesByCategory.evidence,
    otherImagesByCategory.character_name,
    otherImagesByCategory.character_avatars,
    otherImagesByCategory.history,
    otherImagesByCategory.character_stand_variants,
  ];

  // 将其他图片添加到队列
  for (const categoryImages of categoryOrder) {
    if (categoryImages.length > 0) {
      preloadQueue.add(categoryImages);
    }
  }
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
