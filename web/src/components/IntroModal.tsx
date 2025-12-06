/**
 * 游戏介绍模态框组件
 * 
 * 功能：
 * - 在游戏开始时显示欢迎信息和游戏说明
 * - 介绍玩家角色和游戏目标
 * - 说明如何与角色对话、调查地点、出示证物
 * - 提示游戏结束后的推理环节
 * - 提供学习更多信息的链接
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button, Text } from '@mantine/core';

interface IntroModalProps {
  opened: boolean;
  onClose: () => void;
}

// 基准尺寸：1136x746
const BASE_WIDTH = 1136;
const BASE_HEIGHT = 746;
// 16:9 宽高比限制
const ASPECT_RATIO = 16 / 9;

const IntroModal: React.FC<IntroModalProps> = ({ opened, onClose }) => {
  const [scale, setScale] = useState<number>(1);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth > window.innerHeight);

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
        .intro-modal-close-button:focus,
        .intro-modal-close-button:focus-visible,
        .intro-modal-close-button:focus-within {
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
            案件说明
          </Text>
        }
        classNames={{
          close: 'intro-modal-close-button',
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
      今天下午四点，泽渡可可、城崎诺亚和夏目安安发现了宝生玛格的尸体。她倒在图书室内部，背后插着莲见蕾雅的刺剑。尸体旁边，掉落着黑部奈叶香的发带，上面沾有血迹。图书室中央的樱树上插着一根弩箭，箭尾指向图书室门口。本应在玄关大厅的扫帚不知为何出现在樱树旁边。根据冰上梅露露的判断，玛格的死亡时间大约是14:30-15:00，尸体有被刺伤和砸伤的痕迹，尚不明确真正的死因。图书室内部和门口均有一些红蝴蝶在飞舞。
      </Text>
      <br></br>
      <Text style={{ 
        color: 'rgba(220, 220, 220, 1)', 
        lineHeight: '1.8',
        fontSize: `${16 * scale}px`,
      }}>
        在这座实行"魔女审判"规则的监狱中，案发后必须找出真凶，否则将会有无辜的少女被处决。而你，二阶堂希罗，被赋予了侦探的职责，必须引领调查，揭开真相。
      </Text>
      <br></br>
      <Text style={{ 
        color: 'rgba(220, 220, 220, 1)', 
        lineHeight: '1.8',
        fontSize: `${16 * scale}px`,
      }}>
        接下来，你需要通过探索不同地点来搜集线索与证物，并与其他少女对话以获取信息。当你获得关键证物时，可以向特定少女出示，她们的证言可能会因此改变或透露出新的内容。同时，一些关键的证言本身也可能成为揭露更多矛盾的重要证据。
      </Text>
      <br></br>
      <Text style={{ 
        color: 'rgba(220, 220, 220, 1)', 
        lineHeight: '1.8',
        fontSize: `${16 * scale}px`,
      }}>
        岛上每个人都可能怀揣秘密，真相就隐藏于她们的言语与物品的交织之中。现在，开始你的魔女搜查吧。
      </Text>
      <br></br>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: `${5 * scale}px` }}>
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
          开始调查
        </Button>
      </div>
    </Modal>
    </>
  );
};

export default IntroModal;