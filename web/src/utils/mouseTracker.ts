/**
 * 鼠标坐标追踪工具
 * 在页面上实时显示鼠标的坐标位置
 */

let isTracking = false;
let coordinateElement: HTMLDivElement | null = null;

export const startMouseTracking = () => {
  if (isTracking) {
    return () => {}; // 已经在追踪中，返回空的清理函数
  }

  isTracking = true;
  let handleMouseMove: ((event: MouseEvent) => void) | null = null;

  // 创建坐标显示元素
  coordinateElement = document.createElement('div');
  coordinateElement.id = 'mouse-coordinate-display';
  coordinateElement.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: #4CAF50;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: bold;
    z-index: 10000;
    pointer-events: none;
    user-select: none;
    border: 1px solid rgba(76, 175, 80, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  coordinateElement.textContent = '鼠标坐标: (0, 0)';
  document.body.appendChild(coordinateElement);

  handleMouseMove = (event: MouseEvent) => {
    if (!coordinateElement) return;

    const x = event.clientX;
    const y = event.clientY;
    const pageX = event.pageX;
    const pageY = event.pageY;
    
    // 检查鼠标是否在地图图片或证物图片上
    const mapImage = document.querySelector('img[alt*="Map"]') as HTMLImageElement;
    const evidenceImage = document.querySelector('img[alt="Evidence Background"]') as HTMLImageElement;
    let imageCoords = '';
    
    // 计算坐标的辅助函数
    const calculateImageCoords = (img: HTMLImageElement, label: string): string | null => {
      const rect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      if (naturalWidth === 0 || naturalHeight === 0) return null;
      
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // 计算缩放比例（考虑 objectFit: contain）
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      const scale = Math.min(scaleX, scaleY);
      
      // 计算实际显示的图片尺寸
      const actualDisplayWidth = naturalWidth / scale;
      const actualDisplayHeight = naturalHeight / scale;
      
      // 计算留白偏移量
      const offsetX = (displayWidth - actualDisplayWidth) / 2;
      const offsetY = (displayHeight - actualDisplayHeight) / 2;
      
      // 计算点击位置相对于容器的坐标
      const clickX = x - rect.left;
      const clickY = y - rect.top;
      
      // 检查是否在图片实际显示区域内
      if (clickX >= offsetX && clickX <= offsetX + actualDisplayWidth &&
          clickY >= offsetY && clickY <= offsetY + actualDisplayHeight) {
        // 计算相对于实际显示图片的坐标
        const imageRelativeX = clickX - offsetX;
        const imageRelativeY = clickY - offsetY;
        
        // 转换为图片原始坐标
        const imageX = Math.round(imageRelativeX * scale);
        const imageY = Math.round(imageRelativeY * scale);
        
        return ` | ${label}: (${imageX}, ${imageY})`;
      }
      return null;
    };
    
    // 优先检查地图图片，如果不在地图上则检查证物图片
    if (mapImage) {
      const coords = calculateImageCoords(mapImage, '地图');
      if (coords) {
        imageCoords = coords;
      } else if (evidenceImage) {
        const coords = calculateImageCoords(evidenceImage, '证物');
        if (coords) {
          imageCoords = coords;
        }
      }
    } else if (evidenceImage) {
      const coords = calculateImageCoords(evidenceImage, '证物');
      if (coords) {
        imageCoords = coords;
      }
    }
    
    // 在页面上显示坐标
    coordinateElement.textContent = `屏幕: (${x}, ${y}) | 页面: (${pageX}, ${pageY})${imageCoords}`;
  };

  window.addEventListener('mousemove', handleMouseMove);

  // 返回清理函数
  return () => {
    if (handleMouseMove) {
      window.removeEventListener('mousemove', handleMouseMove);
    }
    if (coordinateElement && coordinateElement.parentNode) {
      coordinateElement.parentNode.removeChild(coordinateElement);
    }
    coordinateElement = null;
    isTracking = false;
  };
};

export const stopMouseTracking = () => {
  isTracking = false;
  if (coordinateElement && coordinateElement.parentNode) {
    coordinateElement.parentNode.removeChild(coordinateElement);
  }
  coordinateElement = null;
};

