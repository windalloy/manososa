/**
 * 字体加载工具
 * 用于在游戏初始化时预加载字体文件
 * 直接从 Google Fonts 加载思源宋体作为替代字体
 */

/**
 * 从 Google Fonts 加载思源宋体字体文件
 */
const loadNotoSerifSC = async (): Promise<void> => {
  try {
    // 加载Google Fonts的CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap';
    document.head.appendChild(link);

    // 等待CSS加载完成，然后从CSS中提取字体URL
    const cssText = await new Promise<string>((resolve) => {
      link.onload = async () => {
        try {
          const response = await fetch(link.href);
          const css = await response.text();
          resolve(css);
        } catch {
          resolve('');
        }
      };
      link.onerror = () => resolve('');
      setTimeout(() => resolve(''), 3000);
    });

    // 创建字体映射
    const style = document.createElement('style');
    style.id = 'fangzheng-font-alias';
    
    if (cssText) {
      const woff2Match = cssText.match(/url\(([^)]+\.woff2[^)]*)\)/);
      const woffMatch = cssText.match(/url\(([^)]+\.woff[^)]*)\)/);
      
      const woff2Url = woff2Match ? woff2Match[1] : null;
      const woffUrl = woffMatch ? woffMatch[1] : null;
      
      if (woff2Url || woffUrl) {
        style.textContent = `
          @font-face {
            font-family: "FangZheng GongWen XiaoBiaoSong";
            src: ${woff2Url ? `url('${woff2Url}') format('woff2')` : ''}${woff2Url && woffUrl ? ',' : ''}${woffUrl ? `url('${woffUrl}') format('woff')` : ''};
            font-weight: 400 900;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "方正公文小标宋";
            src: ${woff2Url ? `url('${woff2Url}') format('woff2')` : ''}${woff2Url && woffUrl ? ',' : ''}${woffUrl ? `url('${woffUrl}') format('woff')` : ''};
            font-weight: 400 900;
            font-style: normal;
            font-display: swap;
          }
        `;
      } else {
        style.textContent = `
          @font-face {
            font-family: "FangZheng GongWen XiaoBiaoSong";
            src: local("Noto Serif SC");
            font-weight: 400 900;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "方正公文小标宋";
            src: local("Noto Serif SC");
            font-weight: 400 900;
            font-style: normal;
            font-display: swap;
          }
        `;
      }
    } else {
      style.textContent = `
        @font-face {
          font-family: "FangZheng GongWen XiaoBiaoSong";
          src: local("Noto Serif SC");
          font-weight: 400 900;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "方正公文小标宋";
          src: local("Noto Serif SC");
          font-weight: 400 900;
          font-style: normal;
          font-display: swap;
        }
      `;
    }
    
    const existing = document.getElementById('fangzheng-font-alias');
    if (existing) {
      existing.remove();
    }
    document.head.appendChild(style);

    // 等待字体加载完成
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      const checkFont = () => {
        attempts++;
        if (document.fonts.check('1em "Noto Serif SC"') || 
            document.fonts.check('1em "FangZheng GongWen XiaoBiaoSong"') || 
            attempts >= maxAttempts) {
          resolve();
        } else {
          setTimeout(checkFont, 100);
        }
      };
      setTimeout(checkFont, 500);
    });

    console.log('成功从Google Fonts加载替代字体: Noto Serif SC (思源宋体)');
  } catch (error) {
    console.warn('加载字体失败', error);
  }
};

/**
 * 预加载"方正公文小标宋"字体
 * 直接从Google Fonts加载思源宋体作为替代字体
 */
export const loadFangZhengFont = async (): Promise<void> => {
  await loadNotoSerifSC();
};

