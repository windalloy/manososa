import React, { useState, useEffect } from "react";
import { Container, MantineProvider } from "@mantine/core";
import Home from "./pages/Home";
import { MysteryProvider } from "./providers/mysteryContext";
import { SessionProvider } from "./providers/sessionContext";
import Loading from "./components/Loading";
import { preloadImagesWithProgress } from "./utils/imagePreloader";
import { loadFangZhengFont } from "./utils/fontLoader";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // 首先预加载字体（最高优先级）
    const loadFonts = async () => {
      try {
        await loadFangZhengFont();
      } catch (error) {
        console.warn('字体预加载失败，将使用系统fallback字体', error);
      }
    };

    // 然后预加载logo.webp
    const loadLogo = async () => {
      try {
        const logoSrc = require('./assets/logo.webp');
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // 即使失败也继续
          img.src = logoSrc;
        });
      } catch {
        // 忽略错误，继续加载其他资源
      }
    };

    // 收集需要预加载的资源
    const characterImages = [
      'ema.jpg', 'hiro.jpg', 'anan.jpg', 'noa.jpg', 'leia.jpg', 
      'milia.jpg', 'nanoka.jpg', 'arisa.jpg', 'sherry.jpg', 
      'hanna.jpg', 'koko.jpg', 'meruru.jpg'
    ];

    // 收集01-11背景图
    const bgImages: string[] = [];
    for (let i = 1; i <= 11; i++) {
      const num = String(i).padStart(2, '0');
      try {
        const src = require(`./assets/bg/${num}.avif`);
        if (src) bgImages.push(src);
      } catch {
        // 忽略不存在的图片
      }
    }

    // 收集所有基础立绘
    const baseStandImages: string[] = [];
    characterImages.forEach(imageFile => {
      const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
      try {
        const src = require(`./assets/character_stand/${baseName}.webp`);
        if (src) baseStandImages.push(src);
      } catch {
        // 忽略不存在的图片
      }
    });

    // 收集全人物头像
    const characterAvatars: string[] = [];
    characterImages.forEach(imageFile => {
      const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
      try {
        const src = require(`./assets/character_avatars/${baseName}.webp`);
        if (src) characterAvatars.push(src);
      } catch {
        // 忽略不存在的图片
      }
    });

    // 合并所有需要加载的图片
    const allImages = [...bgImages, ...baseStandImages, ...characterAvatars];

    // 先加载字体和logo，然后加载其他资源
    Promise.all([loadFonts(), loadLogo()]).then(() => {
      // 开始预加载其他资源
      preloadImagesWithProgress(allImages, (loaded, total) => {
        const progress = (loaded / total) * 100;
        setLoadingProgress(progress);
        
        // 通过自定义事件通知Loading组件
        const event = new CustomEvent('loadingProgress', { detail: progress });
        window.dispatchEvent(event);
      }).then(() => {
        // 加载完成
        setLoadingProgress(100);
        const event = new CustomEvent('loadingProgress', { detail: 100 });
        window.dispatchEvent(event);
      }).catch(() => {
        // 即使出错也继续
        setLoadingProgress(100);
        const event = new CustomEvent('loadingProgress', { detail: 100 });
        window.dispatchEvent(event);
      });
    });
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleProgressUpdate = (progress: number) => {
    setLoadingProgress(progress);
  };

  return (
    <MantineProvider>
      <SessionProvider>
        <MysteryProvider>
          {isLoading ? (
            <Loading onComplete={handleLoadingComplete} onProgressUpdate={handleProgressUpdate} />
          ) : (
            <Home />
          )}
        </MysteryProvider>
      </SessionProvider>
    </MantineProvider>
  );
}
