/**
 * 游戏结束模态框组件
 * 
 * 功能：
 * - 在游戏结束时显示感谢信息
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button, Text, ScrollArea } from '@mantine/core';
import storyData from '../story.json';

interface EndModalProps {
  opened: boolean;
  onClose: () => void;
}

// 基准尺寸：1136x746
const BASE_WIDTH = 1136;
const BASE_HEIGHT = 746;
// 16:9 宽高比限制
const ASPECT_RATIO = 16 / 9;

const EndModal: React.FC<EndModalProps> = ({ opened, onClose }) => {
  const [scale, setScale] = useState<number>(1);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth > window.innerHeight);
  const [showStoryModal, setShowStoryModal] = useState<boolean>(false);

  useEffect(() => {
    const calculateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      
      // 检测是否为横屏
      setIsLandscape(width > height);
      
      // 计算16:9区域的有效高度（不包含黑边）
      const effectiveHeight = aspectRatio < ASPECT_RATIO 
        ? width / ASPECT_RATIO  // 宽高比小于16:9，使用计算出的高度
        : height;  // 宽高比大于等于16:9，使用实际高度
      
      const scaleX = width / BASE_WIDTH;
      const scaleY = effectiveHeight / BASE_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // 如果是竖屏，显示横屏提示
  if (!isLandscape) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        centered
        withCloseButton={false}
        styles={{
          inner: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
          },
          content: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            borderRadius: `${12 * scale}px`,
            width: `${Math.min(600 * scale, window.innerWidth * 0.9)}px`,
            maxWidth: '90vw',
          },
          body: {
            backgroundColor: 'transparent',
            padding: `${30 * scale}px ${20 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          },
        }}
      >
        <div style={{ fontSize: `${48 * scale}px`, marginBottom: `${30 * scale}px` }}>📱</div>
        <div style={{ 
          fontSize: `${32 * scale}px`, 
          fontWeight: 'bold', 
          marginBottom: `${20 * scale}px`,
          color: 'rgba(220, 220, 220, 1)',
        }}>
          请将设备横屏使用
        </div>
        <div style={{ 
          fontSize: `${20 * scale}px`, 
          opacity: 0.8,
          color: 'rgba(220, 220, 220, 1)',
        }}>
          为了获得最佳游戏体验，请将您的设备旋转至横屏模式
        </div>
      </Modal>
    );
  }

  // 横屏时显示正常内容
  return (
    <>
      <style>{`
        .end-modal-close-button:focus,
        .end-modal-close-button:focus-visible,
        .end-modal-close-button:focus-within {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <Modal
        opened={opened}
        onClose={onClose}
        size="lg"
        centered
        title={
          <Text style={{ 
            color: 'rgba(220, 220, 220, 1)', 
            fontSize: `${18 * scale}px`,
            fontWeight: 600,
            marginLeft: `${4 * scale}px`,
          }}>
          </Text>
        }
        classNames={{
          close: 'end-modal-close-button',
        }}
        styles={{
          inner: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
          },
          content: {
            backgroundColor: 'rgba(40, 40, 40, 1)',
            borderRadius: `${12 * scale}px`,
            width: `${Math.min(800 * scale, window.innerWidth * 0.9)}px`,
            maxWidth: '90vw',
          },
          header: {
            backgroundColor: 'transparent',
            padding: `${12 * scale}px ${16 * scale}px`,
            minHeight: 'auto',
            height: 'auto',
          },
          body: {
            backgroundColor: 'transparent',
            padding: `0 ${20 * scale}px ${12 * scale}px`,
          },
          close: {
            color: 'rgba(200, 200, 200, 1)',
            width: `${24 * scale}px`,
            height: `${24 * scale}px`,
            minWidth: '20px',
            maxWidth: '28px',
            minHeight: '20px',
            maxHeight: '28px',
          },
        }}
      >
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          游戏结束。非常感谢您能玩到这里！辛苦了。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          现在，希罗酱已经收集到了足够的证据，接下来就是她在审判庭上大展身手的时刻了。不过，那之后的故事，就与本游戏无关了。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          如果想了解完整的案件，请点击下方的“查看剧本”按钮。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          如果对系统感兴趣，可以去{' '}
          <a 
            href="https://github.com/windalloy/manososa" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'rgba(100, 150, 255, 1)',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(120, 170, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(100, 150, 255, 1)';
            }}
          >
            https://github.com/windalloy/manososa
          </a>
          {' '}了解更多内容。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          如果有任何建议或感想，可以来B站评论{' '}
          <a 
            href="https://space.bilibili.com/292666183?spm_id_from=333.1007.0.0" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'rgba(100, 150, 255, 1)',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(120, 170, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(100, 150, 255, 1)';
            }}
          >
            https://space.bilibili.com/292666183?spm_id_from=333.1007.0.0
          </a>
          {' '}。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          如果想用这个系统写自己的剧本，尽管拿去用就好，不用征求我的意见。
        </Text>
        <br></br>
        <Text style={{ 
          color: 'rgba(220, 220, 220, 1)', 
          lineHeight: '1.8',
          fontSize: `${16 * scale}px`,
        }}>
          最后，这其实只是人工智能课的一次大作业，没想到不知不觉就给做成了这个样子。不管是写剧本还是写这类系统，这都是我的第一次尝试。因此，再次衷心感谢您，体验了这个尚显简易的小游戏。
        </Text>
        <br></br>
        <div style={{ display: 'flex', justifyContent: 'center', gap: `${10 * scale}px`, marginTop: `${5 * scale}px` }}>
          <Button 
            onClick={() => setShowStoryModal(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'rgba(220, 220, 220, 1)',
              padding: `${6 * scale}px ${16 * scale}px`,
              fontSize: `${13 * scale}px`,
              height: 'fit-content',
              lineHeight: '1.5',
            }}
          >
            查看剧本
          </Button>
          <Button 
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'rgba(220, 220, 220, 1)',
              padding: `${6 * scale}px ${16 * scale}px`,
              fontSize: `${13 * scale}px`,
              height: 'fit-content',
              lineHeight: '1.5',
            }}
          >
            知道了
          </Button>
        </div>
      </Modal>
      
      {/* 剧本显示 Modal */}
      <Modal
        opened={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        size="xl"
        centered
        title={
          <Text style={{ 
            color: 'rgba(220, 220, 220, 1)', 
            fontSize: `${20 * scale}px`,
            fontWeight: 600,
          }}>
            {storyData.title}
          </Text>
        }
        styles={{
          inner: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
          },
          content: {
            backgroundColor: 'rgba(40, 40, 40, 1)',
            borderRadius: `${12 * scale}px`,
            width: `${Math.min(900 * scale, window.innerWidth * 0.9)}px`,
            maxWidth: '90vw',
            maxHeight: '85vh',
          },
          header: {
            backgroundColor: 'transparent',
            padding: `${16 * scale}px ${20 * scale}px`,
            minHeight: 'auto',
            height: 'auto',
            borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          },
          body: {
            backgroundColor: 'transparent',
            padding: `${20 * scale}px`,
            maxHeight: 'calc(85vh - 80px)',
          },
          close: {
            color: 'rgba(200, 200, 200, 1)',
            width: `${24 * scale}px`,
            height: `${24 * scale}px`,
          },
        }}
      >
        <ScrollArea 
          style={{ 
            height: 'calc(85vh - 120px)',
          }}
          offsetScrollbars
          styles={{
            root: {
              paddingRight: `${10 * scale}px`,
            },
            viewport: {
              paddingRight: `${10 * scale}px`,
            },
            scrollbar: {
              '&[data-orientation="vertical"] .mantine-ScrollArea-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                },
              },
            },
          }}
        >
          <div style={{ paddingRight: `${10 * scale}px` }}>
            {storyData.content.map((section, index) => (
              <div key={index} style={{ marginBottom: `${20 * scale}px` }}>
                <Text
                  style={{
                    color: 'rgba(100, 150, 255, 1)',
                    fontSize: `${18 * scale}px`,
                    fontWeight: 600,
                    marginBottom: `${8 * scale}px`,
                    display: 'block',
                  }}
                >
                  {section.time.startsWith('■') ? section.time : `■ ${section.time}`}
                </Text>
                {section.events.map((event, eventIndex) => (
                  <Text
                    key={eventIndex}
                    style={{
                      color: 'rgba(220, 220, 220, 1)',
                      fontSize: `${15 * scale}px`,
                      lineHeight: '1.8',
                      marginBottom: `${6 * scale}px`,
                      paddingLeft: `${12 * scale}px`,
                      display: 'block',
                    }}
                  >
                    {event}
                  </Text>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Modal>
    </>
  );
};

export default EndModal;