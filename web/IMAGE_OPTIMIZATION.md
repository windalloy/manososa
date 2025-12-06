# 图片加载优化方案

本文档列出了所有已实现和可选的图片加载优化方案。

## 已实现的优化

### 1. 图片格式优化 ✅
- **背景图片**：使用 AVIF 格式（更好的压缩率）
- **其他图片**：使用 WebP 格式（广泛支持，压缩率高）
- **工具**：`convert-images.js` 脚本自动转换

### 2. 优先级预加载 ✅
- **第一优先级**：角色立绘（立即加载）
- **第二优先级**：背景图片（延迟 50ms）
- **第三优先级**：其他图片（延迟 100ms）
- **实现**：`web/src/utils/imagePreloader.ts`

### 3. 分批加载 ✅
- 高优先级图片：每批 3 张
- 低优先级图片：每批 5 张
- 避免同时加载过多图片导致网络拥塞

### 4. 智能缓存 ✅
- 内存缓存：避免重复加载同一图片
- 浏览器缓存：利用 HTTP 缓存头

### 5. 使用 fetchPriority ✅
- 高优先级图片使用 `fetchPriority: 'high'`
- 低优先级图片使用 `fetchPriority: 'low'`
- 浏览器会根据优先级调度资源加载

### 6. requestIdleCallback ✅
- 低优先级图片使用 `requestIdleCallback` 延迟加载
- 不阻塞主线程和关键资源

### 7. Link Preload ✅
- 关键图片使用 `<link rel="preload">` 预加载
- 最高优先级，浏览器会优先下载

## 可选的进一步优化

### 1. CDN 加速
如果图片托管在 CDN：
```html
<!-- 在 index.html 中添加 -->
<link rel="dns-prefetch" href="https://your-cdn.com" />
<link rel="preconnect" href="https://your-cdn.com" crossorigin />
```

### 2. HTTP/2 Server Push
如果服务器支持 HTTP/2，可以推送关键图片：
- 需要服务器配置
- 适用于关键资源

### 3. Service Worker 缓存
使用 Service Worker 缓存图片：
```javascript
// 在 service worker 中
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

### 4. 响应式图片（srcset）
根据屏幕尺寸加载不同大小的图片：
```html
<img 
  srcset="image-small.webp 480w, image-medium.webp 768w, image-large.webp 1200w"
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
  src="image-large.webp"
  alt="..."
/>
```

### 5. 图片懒加载（loading="lazy"）
对于非关键图片，使用原生懒加载：
```html
<img src="image.webp" loading="lazy" alt="..." />
```

### 6. 渐进式图片加载
使用 WebP 的渐进式加载：
- 先显示低质量版本
- 逐步加载高质量版本
- 需要图片处理工具支持

### 7. 图片占位符（Blur Placeholder）
在图片加载前显示模糊占位符：
```javascript
// 使用小尺寸的 base64 图片作为占位符
const placeholder = 'data:image/webp;base64,...';
```

### 8. HTTP 缓存头优化
在服务器端设置合适的缓存头：
```
Cache-Control: public, max-age=31536000, immutable
```

### 9. 图片尺寸优化
根据实际显示尺寸加载图片：
- 如果只显示 200x200，不需要加载 1000x1000
- 使用图片处理服务动态调整尺寸

### 10. IndexedDB 存储
对于频繁使用的图片，存储在 IndexedDB：
```javascript
// 存储图片到 IndexedDB
const store = db.transaction('images', 'readwrite').objectStore('images');
store.put(blob, imageUrl);
```

## 性能监控

可以使用以下工具监控图片加载性能：

1. **Chrome DevTools Network 面板**
   - 查看加载时间
   - 检查缓存命中率
   - 分析加载优先级

2. **Lighthouse**
   - 评估图片优化建议
   - 检查未使用的图片

3. **WebPageTest**
   - 分析图片加载瀑布图
   - 检查首屏渲染时间

## 使用建议

1. **开发环境**：保持当前的优化即可
2. **生产环境**：
   - 确保所有图片都已转换为 AVIF/WebP
   - 考虑使用 CDN
   - 设置合适的 HTTP 缓存头
   - 监控图片加载性能

3. **移动端**：
   - 考虑使用更小的图片尺寸
   - 使用响应式图片（srcset）
   - 启用懒加载

## 代码示例

### 预加载单个图片
```typescript
import { preloadSingleImage } from '../utils/imagePreloader';

// 立即预加载
preloadSingleImage('/path/to/image.webp');
```

### 预连接服务器
```typescript
import { preconnectImageServer } from '../utils/imagePreloader';

// 预连接 CDN
preconnectImageServer('https://cdn.example.com');
```

### 清除缓存
```typescript
import { clearImageCache } from '../utils/imagePreloader';

// 清除所有缓存（谨慎使用）
clearImageCache();
```

