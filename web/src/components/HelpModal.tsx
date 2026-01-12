/**
 * 游戏说明模态框组件
 * 
 * 功能：
 * - 显示游戏操作说明
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button, Text, ScrollArea } from '@mantine/core';
import { blendColorWithBlack } from '../config/characterColors';

interface HelpModalProps {
  opened: boolean;
  onClose: () => void;
}

// 基准尺寸：1136x746
const BASE_WIDTH = 1136;
const BASE_HEIGHT = 746;
// 16:9 宽高比限制
const ASPECT_RATIO = 16 / 9;

// 通用文字高亮函数：将文本中指定的文字标记为指定颜色
// text: 原始文本
// highlights: 需要高亮的文字数组，每个元素可以是字符串或 {text: string, color?: string}
// defaultColor: 默认高亮颜色，默认为黄色
const highlightText = (
  text: string, 
  highlights: (string | { text: string; color?: string })[], 
  defaultColor: string = '#FFD700'
): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  
  // 找到所有需要高亮的文字位置
  const matches: Array<{ index: number; text: string; color: string }> = [];
  
  highlights.forEach(highlight => {
    const highlightText = typeof highlight === 'string' ? highlight : highlight.text;
    const highlightColor = typeof highlight === 'string' ? defaultColor : (highlight.color || defaultColor);
    
    let index = text.indexOf(highlightText, 0);
    while (index !== -1) {
      matches.push({ index, text: highlightText, color: highlightColor });
      index = text.indexOf(highlightText, index + 1);
    }
  });
  
  // 按位置排序，如果位置相同，按长度降序排列（优先匹配更长的文字）
  matches.sort((a, b) => {
    if (a.index !== b.index) {
      return a.index - b.index;
    }
    return b.text.length - a.text.length;
  });
  
  // 处理重叠的情况：只保留第一个匹配
  const filteredMatches: typeof matches = [];
  let currentEnd = -1;
  matches.forEach(match => {
    if (match.index >= currentEnd) {
      filteredMatches.push(match);
      currentEnd = match.index + match.text.length;
    }
  });
  
  filteredMatches.forEach((match) => {
    // 添加高亮文字之前的内容
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // 添加高亮文字（指定颜色）
    parts.push(
      <span key={`${match.index}-${keyIndex++}`} style={{ color: match.color }}>
        {match.text}
      </span>
    );
    lastIndex = match.index + match.text.length;
  });
  
  // 添加剩余内容
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
};

// 高亮冒号之前的词语：只标黄冒号之前的词语，不标黄文本中其他相同词语
// text: 原始文本
// color: 高亮颜色，默认为黄色
const highlightBeforeColon = (
  text: string,
  color: string = '#FFD700'
): React.ReactNode => {
  const colonIndex = text.indexOf('：');
  if (colonIndex === -1) {
    return text;
  }
  
  const beforeColon = text.substring(0, colonIndex);
  const afterColon = text.substring(colonIndex);
  
  return (
    <>
      <span style={{ color }}>{beforeColon}</span>
      {afterColon}
    </>
  );
};

// 高亮引号内的特定词语：去掉引号，只标黄引号内的指定词语
// text: 原始文本
// quotedWords: 需要标黄的引号内的词语数组
// color: 高亮颜色，默认为黄色
const highlightQuotedWords = (
  text: string,
  quotedWords: string[],
  color: string = '#FFD700'
): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  
  // 找到所有引号内的指定词语的位置
  const matches: Array<{ index: number; word: string; quotedPattern: string }> = [];
  
  quotedWords.forEach(word => {
    const quotedPattern = `"${word}"`;
    let searchIndex = 0;
    let index = text.indexOf(quotedPattern, searchIndex);
    while (index !== -1) {
      matches.push({ index, word, quotedPattern });
      searchIndex = index + 1;
      index = text.indexOf(quotedPattern, searchIndex);
    }
  });
  
  // 按位置排序
  matches.sort((a, b) => a.index - b.index);
  
  // 构建结果：去掉引号，标黄这些词
  matches.forEach((match) => {
    // 添加匹配词之前的内容
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // 添加匹配词（黄色，不带引号）
    parts.push(
      <span key={`quoted-${match.index}-${keyIndex++}`} style={{ color }}>
        {match.word}
      </span>
    );
    
    lastIndex = match.index + match.quotedPattern.length;
  });
  
  // 添加最后剩余的内容
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // 如果没有任何匹配，直接返回原文本
  if (matches.length === 0) {
    return text;
  }
  
  return <>{parts}</>;
};

const HelpModal: React.FC<HelpModalProps> = ({ opened, onClose }) => {
  const [scale, setScale] = useState<number>(1);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth > window.innerHeight);
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码，从1开始
  const [hasExistingWarning, setHasExistingWarning] = useState<boolean>(false);

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

  // 检查是否已经有横屏提示遮罩层
  useEffect(() => {
    const checkExistingWarning = () => {
      const existing = document.querySelector('[data-landscape-warning="true"]') !== null;
      setHasExistingWarning(existing);
    };
    
    checkExistingWarning();
    // 定期检查，因为遮罩层可能动态出现或消失
    const interval = setInterval(checkExistingWarning, 100);
    return () => clearInterval(interval);
  }, []);

  // 当模态框打开时，重置到第一页
  useEffect(() => {
    if (opened) {
      setCurrentPage(1);
    }
  }, [opened]);

  // 如果是竖屏，检查是否已经有横屏提示遮罩层
  if (!isLandscape) {
    // 如果已经有横屏提示，就不显示Modal中的提示
    if (hasExistingWarning) {
      return null;
    }
    
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
            {currentPage === 1 ? '案件说明' : currentPage === 2 ? '功能说明' : '注意事项'}
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
            background: `radial-gradient(circle at center, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.9) 75%, rgba(0, 0, 0, 0.85) 85%, rgba(139, 0, 0, 0.3) 95%, rgba(139, 0, 0, 0.5) 100%)`,
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
              {highlightText('接下来，你需要通过调查不同地点来搜集线索与证物，并与其他少女对话以获取信息。当你获得关键证物时，可以向特定少女进行出示，她们的证言可能会因此改变或透露出新的内容。同时，一些关键的证言本身也可能成为揭露更多矛盾的重要证据。', ['调查', '对话', '出示'])}
              <br></br><br></br>
              岛上每个人都可能怀揣秘密，真相就隐藏于她们的言语与物品的交织之中。现在，开始你的魔女搜查吧。
            </Text>
          )}

          {/* 第二页：游戏操作说明 */}
          {currentPage === 2 && (
            <>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                {highlightBeforeColon('调查：你可以前往各个地点仔细查看，寻找可能的线索和证物（非常建议先对所有场景进行调查）。')}
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                {highlightBeforeColon('出示：当你获得证物后，可以向特定的少女出示，触发特定对话。如果少女通过证物回想起了什么，她们的证言也会因此发生改变（所以建议在和角色对话前先出示一些可疑的证物）。')}
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                {highlightBeforeColon('对话：你可以和遇到的少女交谈，她们或许知道些什么。一些关键的证言本身也可能成为新的可出示的证据，用于揭露更多的矛盾。')}
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                {highlightBeforeColon('行动次数：调查和出示均消耗1次行动次数，对话消耗2次行动次数。剩余行动次数为0时，进入审判阶段，游戏结束。由于案件涉及的事件很多，您没必要理清所有的疑点，如果您觉得找到了凶手，可以直接点击"结束游戏"按钮。。')}
              </Text>
              <br></br>
              <Text style={{ 
                color: 'rgba(220, 220, 220, 1)', 
                lineHeight: '1.8',
                fontSize: `${16 * scale}px`,
              }}>
                {highlightBeforeColon('提示：通过提示可以查看证物和证言的收集进度，也可以随机获得一个证物或证言的获取条件。')}
              </Text>
            </>
          )}

          {/* 第三页：建议 */}
          {currentPage === 3 && (
            <Text style={{ 
              color: 'rgba(220, 220, 220, 1)', 
              lineHeight: '1.8',
              fontSize: `${16 * scale}px`,
            }}>
              如果在游戏过程中调整了屏幕尺寸或分辨率，可能会造成界面布局错乱。如果遇到这种情况，请刷新页面。
              <br></br><br></br>
              {highlightQuotedWords('只有"出示"行为可以解锁少女们的新证言，"对话"只会让您更加了解事情的全貌，而不会让角色回想起更多的信息。', ['出示', '对话'])}
              <br></br><br></br>
              {highlightText('事件发生在12:00 - 16:00之间，如果您向角色提问这个时间段之外的事情或者闲聊，她们的回答并不是可信的。如果问到案件相关的事情，怀揣秘密的角色也可能会进行欺骗和隐瞒。如果您觉得角色的回答实在太离谱了，那可能是模型出现了幻觉，可以尝试再问她一次或者换个问法。', ['12:00 - 16:00'])}
              <br></br><br></br>
              和希罗进行对话时，她会基于和各角色的对话记录（而非基于剧本），进行自问自答，因此她的回答通常是不可信的，仅供娱乐使用。
            </Text>
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

