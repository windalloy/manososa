import React, { useEffect, useState } from 'react';
import { Progress } from '@mantine/core';

interface LoadingProps {
  onComplete: () => void;
  onProgressUpdate: (progress: number) => void;
}

const Loading: React.FC<LoadingProps> = ({ onComplete, onProgressUpdate }) => {
  const [progress, setProgress] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // 监听进度更新
    const handleProgress = (e: CustomEvent<number>) => {
      const newProgress = e.detail;
      setProgress(newProgress);
      onProgressUpdate(newProgress);
      
      if (newProgress >= 100) {
        // 延迟一点时间让进度条完成动画
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    window.addEventListener('loadingProgress' as any, handleProgress as EventListener);
    
    return () => {
      window.removeEventListener('loadingProgress' as any, handleProgress as EventListener);
    };
  }, [onComplete, onProgressUpdate]);

  // 预加载logo
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setLogoLoaded(true);
    };
    img.onerror = () => {
      // 即使加载失败也继续
      setLogoLoaded(true);
    };
    try {
      const logoSrc = require('../assets/logo.webp');
      img.src = logoSrc;
    } catch {
      setLogoLoaded(true);
    }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      {logoLoaded && (
        <>
          <img
            src={require('../assets/logo.webp')}
            alt="Logo"
            style={{
              width: '150px',
              height: '150px',
              marginBottom: '30px',
              animation: 'spin 3.5s linear infinite',
            }}
          />
          <div
            style={{
              width: '50%',
              maxWidth: '450px',
              minWidth: '250px',
            }}
          >
            <Progress
              value={progress}
              size="md"
              radius="md"
              color="blue"
              animated
              style={{
                marginBottom: '15px',
              }}
            />
            <div
              style={{
                textAlign: 'center',
                color: '#ffffff',
                fontSize: '16px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {Math.round(progress)}%
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;

