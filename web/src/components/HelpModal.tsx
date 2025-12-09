/**
 * 游戏说明模态框组件
 * 
 * 功能：
 * - 显示游戏操作说明
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button, Text, ScrollArea } from '@mantine/core';

interface HelpModalProps {
  opened: boolean;
  onClose: () => void;
}

// 基准尺寸：1136x746
const BASE_WIDTH = 1136;
const BASE_HEIGHT = 746;
// 16:9 宽高比限制
const ASPECT_RATIO = 16 / 9;

const HelpModal: React.FC<HelpModalProps> = ({ opened, onClose }) => {
  const [scale, setScale] = useState<number>(1);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth > window.innerHeight);
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码，从1开始

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

  // 当模态框打开时，重置到第一页
  useEffect(() => {
    if (opened) {
      setCurrentPage(1);
    }
  }, [opened]);

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
        .help-modal-close-button:focus,
        .help-modal-close-button:focus-visible,
        .help-modal-close-button:focus-within {
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
            说明
          </Text>
        }
        classNames={{
          close: 'help-modal-close-button',
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
            padding: `${20 * scale}px ${20 * scale}px ${12 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '70vh',
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
        <ScrollArea 
          style={{ 
            flex: 1,
            minHeight: 0,
          }}
          offsetScrollbars
          styles={{
            root: {
              flex: 1,
              minHeight: 0,
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
          {/* 第一页：游戏背景介绍 */}
          {currentPage === 1 && (
            <Text style={{ 
              color: 'rgba(220, 220, 220, 1)', 
              lineHeight: '1.8',
              fontSize: `${16 * scale}px`,
            }}>
              今天下午四点，泽渡可可、城崎诺亚和夏目安安发现了宝生玛格的尸体。她倒在图书室内部，背后插着莲见蕾雅的刺剑。尸体旁边，掉落着黑部奈叶香的发带，上面沾有血迹。图书室中央的樱树上插着一根弩箭，箭尾指向图书室门口。本应在玄关大厅的扫帚不知为何出现在樱树旁边。根据冰上梅露露的判断，玛格的死亡时间大约是14:30-15:00，尸体有被刺伤和砸伤的痕迹，尚不明确真正的死因。图书室内部和门口均有一些红蝴蝶在飞舞。
              <br></br><br></br>
              在这座实行"魔女审判"规则的监狱中，案发后必须找出真凶，否则将会有无辜的少女被处决。而你，二阶堂希罗，被赋予了侦探的职责，必须引领调查，揭开真相。
              <br></br><br></br>
              接下来，你需要通过探索不同地点来搜集线索与证物，并与其他少女对话以获取信息。当你获得关键证物时，可以向特定少女出示，她们的证言可能会因此改变或透露出新的内容。同时，一些关键的证言本身也可能成为揭露更多矛盾的重要证据。
              <br></br><br></br>
              岛上每个人都可能怀揣秘密，真相就隐藏于她们的言语与物品的交织之中。现在，开始你的魔女搜查吧。
            </Text>
          )}

          {/* 第二页和第三页：游戏操作说明 */}
          {(currentPage === 2 || currentPage === 3) && (
            <>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                调查：你可以前往各个地点仔细查看，寻找可能的线索和证物。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                出示：当你获得证物后，可以向特定的少女出示，触发特定对话，她们的证言也可能会因此发生改变。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                询问：你可以与遇到的少女对话，她们或许知道些什么。一些关键的证言本身也可能成为新的证据，用于揭露更多的矛盾。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                行动次数：调查和出示均消耗1次行动次数，对话消耗2次行动次数。剩余行动次数为0时，进入审判阶段，游戏结束。你也可以点击"结束游戏"按钮提前结束游戏。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                历史对话：可随时查看与每位少女的全部出示与对话记录，回顾关键信息。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                切换背景：如果当前背景不合心意，可使用此功能直接切换背景。
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                游戏过程中请不要刷新页面！因为网站不会保存游戏进度，刷新页面将会使游戏进度清零！
              </Text>
            </>
          )}
        </ScrollArea>
        
        {/* 分页按钮 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: `${10 * scale}px`, marginTop: `${15 * scale}px` }}>
          {currentPage > 1 && (
            <Button 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(220, 220, 220, 1)',
                padding: `${6 * scale}px ${16 * scale}px`,
                fontSize: `${13 * scale}px`,
                height: 'fit-content',
                lineHeight: '1.5',
              }}
            >
              上一页
            </Button>
          )}
          {currentPage < 3 && (
            <Button 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(220, 220, 220, 1)',
                padding: `${6 * scale}px ${16 * scale}px`,
                fontSize: `${13 * scale}px`,
                height: 'fit-content',
                lineHeight: '1.5',
              }}
            >
              下一页
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
};

export default HelpModal;

