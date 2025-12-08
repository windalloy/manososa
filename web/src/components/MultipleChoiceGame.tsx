/**
 * 多选题游戏组件
 * 
 * 功能：
 * - 在游戏结束时显示推理问题（凶手、动机、其他案件等）
 * - 以多选题形式让玩家进行最终推理
 * - 收集玩家的答案并传递给游戏结束流程
 * - 支持返回游戏或提交答案
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button, Radio, Stack, Title, Image } from '@mantine/core';
import { getNamePosition } from '../config/characterNamePositions';

interface MultipleChoiceGameProps {
  onBackToGame: (answers: string[]) => void;
  onResumeGame: () => void;
  scale?: number; // 缩放比例
  showBackButton?: boolean; // 是否显示返回按钮，默认为true
}

const questions = [
  {
    question: "距审判开始还有一点时间，接下来要进行的行动",
    choices: [
      "调查刺剑上的血迹",
      "调查仪礼剑上的血迹",
      "调查樱树上的弩箭",
      "调查湖边药瓶内的残留液体",
      "调查玛格的摔伤",
      "调查玛格的眼睛",
      "调查蕾雅的花环",
      "调查米莉亚的手机",
      "调查看守的镰刀"
    ]
  },
  {
    question: "当前怀疑的对象是",
    choices: [
      "樱羽艾玛",
      "二阶堂希罗",
      "夏目安安",
      "城崎诺亚",
      "莲见蕾雅",
      "佐伯米莉亚",
      "黑部奈叶香",
      "紫藤亚里沙",
      "橘雪莉",
      "远野汉娜",
      "泽渡可可",
      "冰上梅露露",
    ]
  },
  {
    question: "是否要指控你怀疑的对象",
    choices: [
      "是，指控怀疑对象",
      "否，指控玛格自杀",
    ]
  }
];

const MultipleChoiceGame: React.FC<MultipleChoiceGameProps> = ({ onBackToGame, onResumeGame, scale = 1, showBackButton = true }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResponseBox, setShowResponseBox] = useState(false);
  
  // 逐字显示的状态
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const BASE_WIDTH = 1136; // 基准宽度，与Actor组件保持一致

  // 获取角色名称图片（二阶堂希罗）
  const getCharacterNameImage = (avatarFileName: string): string | null => {
    // 去掉扩展名，获取基础名称
    let baseName = avatarFileName.replace(/\.(jpg|jpeg|png)$/i, '');
    
    // 处理特殊映射（如 arisa -> alisa）
    const nameMapping: Record<string, string> = {
      'arisa': 'alisa',
    };
    
    // 如果存在映射，使用映射后的名称
    const mappedName = nameMapping[baseName] || baseName;
    
    // 返回名称图片文件路径
    const nameImagePath = `character_name/n_${mappedName}.png`;
    try {
      return require(`../assets/${nameImagePath}`);
    } catch {
      return null;
    }
  };

  // 获取二阶堂希罗的名称图片和位置
  const characterNameImageSrc = getCharacterNameImage('hiro.jpg');
  const namePosition = getNamePosition('hiro.jpg');

  const handleNextQuestion = () => {
    if (selectedChoice !== null) {
      const newAnswers = [...answers, selectedChoice];
      setAnswers(newAnswers);
      setSelectedChoice(null); // Reset selected choice for next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // 完成所有问题后，显示回复框而不是直接调用onBackToGame
        setShowResponseBox(true);
      }
    }
  };

  const handleEnterTrial = () => {
    // 点击"进入审判庭"后，传递答案并继续流程
    onBackToGame(answers);
  };

  const handleChoiceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedChoice(event.currentTarget.value);
  };

  // 生成回复框内容
  const responseContent = (() => {
    if (answers.length < 3) {
      return '';
    }
    
    // 根据第三个问题的选择决定结束语
    if (answers[2] === "否，指控玛格自杀") {
      return `我怀疑是${answers[1]}害死了玛格，但是我不打算指控她。玛格的死明显源于一连串的意外，而非任何人的杀意。我们之中没有魔女，只有想要释放善意却笨拙冒失的努力而正确的人。因此，我将指证玛格自杀。为了保护所有人，即便需要编织谎言，我也在所不惜。`;
    } else if (answers[2] === "是，指证怀疑对象") {
      return `明白了。让艾玛去继续${answers[0]}吧。至于我，该去准备正式的指控了。我将整理所有关于 ${answers[1]} 的证词与证物，确保在审判中无可辩驳。我一定要将杀害玛格的魔女亲手送上处刑台。`;
    }
    
    // 默认情况（不应该到达这里，但为了安全起见）
    return `那么，就让艾玛去${answers[0]}吧，我先去审判庭准备指控${answers[1]}的证词了。`;
  })();

  // 逐字显示效果
  useEffect(() => {
    if (!showResponseBox || !responseContent) {
      return;
    }

    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 开始逐字显示
    setIsTyping(true);
    setDisplayedText('');

    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex < responseContent.length) {
        setDisplayedText(responseContent.slice(0, currentIndex + 1));
        currentIndex++;
        // 根据字符类型调整速度：中文字符稍慢，标点符号稍慢
        const char = responseContent[currentIndex - 1];
        let delay: number;
        
        // 句末标点符号（问号、句号、感叹号、省略号）需要额外停顿
        if (/[。！？]/.test(char) || (char === '…' || char === '...')) {
          delay = 150; // 句末标点符号额外停顿
        } else if (/[，、；：]/.test(char)) {
          delay = 100; // 其他标点符号
        } else if (/[\u4e00-\u9fa5]/.test(char)) {
          delay = 50; // 中文字符
        } else {
          delay = 40; // 其他字符
        }
        
        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // 逐字显示完成
        setIsTyping(false);
      }
    };

    // 延迟一点开始显示，让动画更自然
    typingTimeoutRef.current = setTimeout(typeNextChar, 150);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [showResponseBox, responseContent]);

  // 如果显示回复框，渲染回复框界面
  if (showResponseBox) {
    return (
      <>
        {/* 角色名称图片 - 回复框外部左上方 */}
        {characterNameImageSrc && (
          <div
            style={{
              position: 'fixed',
              top: namePosition.top 
                ? (typeof namePosition.top === 'number'
                    ? `${namePosition.top * scale}px`
                    : namePosition.top.includes('calc')
                      ? (() => {
                          // 解析 calc() 表达式，例如 "calc(50% - 200px)" -> "calc(50% - ${200 * scale}px)"
                          const calcMatch = namePosition.top.match(/calc\((.+)\)/);
                          if (calcMatch) {
                            const content = calcMatch[1];
                            // 替换所有 px 值
                            const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                              return `${parseFloat(num) * scale}px`;
                            });
                            return `calc(${scaledContent})`;
                          }
                          return namePosition.top;
                        })()
                      : namePosition.top.includes('%') || namePosition.top.includes('vw') || namePosition.top.includes('vh')
                        ? namePosition.top
                        : `${parseFloat(String(namePosition.top)) * scale}px`)
                : undefined,
              left: namePosition.left
                ? (typeof namePosition.left === 'number'
                    ? `${namePosition.left * scale}px`
                    : namePosition.left.includes('calc')
                      ? (() => {
                          const calcMatch = namePosition.left.match(/calc\((.+)\)/);
                          if (calcMatch) {
                            const content = calcMatch[1];
                            const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                              return `${parseFloat(num) * scale}px`;
                            });
                            return `calc(${scaledContent})`;
                          }
                          return namePosition.left;
                        })()
                      : namePosition.left.includes('%') || namePosition.left.includes('vw') || namePosition.left.includes('vh')
                        ? namePosition.left
                        : `${parseFloat(String(namePosition.left)) * scale}px`)
                : undefined,
              right: namePosition.right
                ? (typeof namePosition.right === 'number'
                    ? `${namePosition.right * scale}px`
                    : namePosition.right.includes('calc')
                      ? (() => {
                          const calcMatch = namePosition.right.match(/calc\((.+)\)/);
                          if (calcMatch) {
                            const content = calcMatch[1];
                            const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                              return `${parseFloat(num) * scale}px`;
                            });
                            return `calc(${scaledContent})`;
                          }
                          return namePosition.right;
                        })()
                      : namePosition.right.includes('%') || namePosition.right.includes('vw') || namePosition.right.includes('vh')
                        ? namePosition.right
                        : `${parseFloat(String(namePosition.right)) * scale}px`)
                : undefined,
              transform: namePosition.transform,
              zIndex: 11,
              pointerEvents: 'none',
            }}
          >
            <Image
              src={characterNameImageSrc}
              alt="二阶堂希罗"
              style={{
                maxHeight: namePosition.maxHeight 
                  ? (typeof namePosition.maxHeight === 'number'
                      ? `${namePosition.maxHeight * scale}px`
                      : namePosition.maxHeight.includes('vh')
                        ? `${(parseFloat(String(namePosition.maxHeight)) * 746 / 100) * scale}px`
                        : namePosition.maxHeight.includes('vw')
                          ? `${(parseFloat(String(namePosition.maxHeight)) * 1136 / 100) * scale}px`
                          : `${parseFloat(String(namePosition.maxHeight)) * scale}px`)
                  : `${80 * scale}px`,
                maxWidth: namePosition.maxWidth
                  ? (typeof namePosition.maxWidth === 'number'
                      ? `${namePosition.maxWidth * scale}px`
                      : namePosition.maxWidth.includes('vw')
                        ? `${(parseFloat(String(namePosition.maxWidth)) * 1136 / 100) * scale}px`
                        : namePosition.maxWidth.includes('vh')
                          ? `${(parseFloat(String(namePosition.maxWidth)) * 746 / 100) * scale}px`
                          : `${parseFloat(String(namePosition.maxWidth)) * scale}px`)
                  : `${200 * scale}px`,
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* 回复框 - 样式与Actor组件中的回复框一致，带半透明黑色背景 */}
        <div
          style={{
            position: 'fixed',
            top: `calc(68% - ${10 * scale}px)`,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${(600 / BASE_WIDTH) * 100}vw`,
            maxWidth: `${600 * scale}px`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: `${10 * scale}px ${15 * scale}px ${5 * scale}px ${20 * scale}px`,
              minHeight: `${180 * scale}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              borderRadius: `${8 * scale}px`,
            }}
          >
            <div
              style={{
                fontSize: `${18 * scale}px`,
                lineHeight: `${32.4 * scale}px`,
                color: 'white',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: `${10 * scale}px`,
                marginTop: `${5 * scale}px`,
              }}
            >
              {isTyping ? displayedText : responseContent}
            </div>
            {/* 进入审判庭按钮 - 只有在逐字播放完成后才显示 */}
            {!isTyping && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  transform: `translateY(-${10 * scale}px)`,
                }}
              >
                <Button
                  onClick={handleEnterTrial}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    height: 'fit-content',
                    padding: `${10 * scale}px ${20 * scale}px`,
                    flexShrink: 0,
                    fontSize: `${14 * scale}px`,
                  }}
                >
                  进入审判庭
                </Button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // 正常显示问题选择界面
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${(800 / BASE_WIDTH) * 100}vw`,
        maxWidth: `${800 * scale}px`,
        zIndex: 10,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: `${30 * scale}px ${25 * scale}px`,
          borderRadius: `${8 * scale}px`,
        }}
      >
        <Title 
          order={2}
          style={{
            color: 'white',
            fontSize: `${20 * scale}px`,
            marginBottom: `${20 * scale}px`,
            textAlign: 'center',
          }}
        >
          {questions[currentQuestionIndex].question}
        </Title>
        <Stack gap={`${15 * scale}px`} style={{ marginBottom: `${25 * scale}px` }}>
          {questions[currentQuestionIndex].choices.map((choice, index) => (
            <Radio
              key={index}
              value={choice}
              checked={selectedChoice === choice}
              onChange={handleChoiceChange}
              label={choice}
              styles={{
                label: {
                  color: 'white',
                  fontSize: `${16 * scale}px`,
                },
                radio: {
                  '&:checked': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                },
              }}
            />
          ))}
        </Stack>
        <div
          style={{
            display: 'flex',
            gap: `${15 * scale}px`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            onClick={handleNextQuestion}
            disabled={!selectedChoice}
            style={{
              backgroundColor: selectedChoice ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: `${16 * scale}px`,
              padding: `${10 * scale}px ${25 * scale}px`,
              border: 'none',
              cursor: selectedChoice ? 'pointer' : 'not-allowed',
            }}
          >
            {currentQuestionIndex < questions.length - 1 ? "下一步" : "完成"}
          </Button>
          {showBackButton && (
            <Button
              onClick={onResumeGame}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: `${16 * scale}px`,
                padding: `${10 * scale}px ${25 * scale}px`,
                border: 'none',
              }}
            >
              返回
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceGame;