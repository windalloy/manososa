/**
 * 角色对话组件
 * 
 * 功能：
 * - 显示单个角色的对话界面，包括消息历史记录和输入框
 * - 处理用户消息发送和AI响应接收
 * - 管理角色状态（消息列表、加载状态等）
 * - 显示角色名称图片和玩家名称图片
 * - 处理证物出示逻辑（通过点击证物按钮）
 * - 支持继续对话功能
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Actor,
  LLMMessage,
  useMysteryContext,
} from "../providers/mysteryContext";
import { Button, Textarea, Image } from "@mantine/core";
import invokeAI from "../api/invoke";
import { useSessionContext } from "../providers/sessionContext";
import CHARACTER_DATA from "../characters.json";
import { getNamePosition } from "../config/characterNamePositions";
import responseKeywordMapping from "../responseKeywordMapping.json";

// 基准尺寸：1136x746
const BASE_WIDTH = 1136;
const BASE_HEIGHT = 746;

// 获取名字图片的require路径（玩家角色）
const getNameImageSrc = () => {
  try {
    return require(`../assets/character_name/name.webp`);
  } catch {
    return null;
  }
};

// 根据角色头像文件名获取角色名称图片路径
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

interface Props {
  actor: Actor;
  onMessageSent?: () => void; // 消息发送成功时的回调
  onEvidenceObtained?: (evidenceId: string) => void; // 证物获取时的回调
  scale?: number; // 缩放比例
  standScale?: number; // 立绘专用缩放比例（用于名称图片，保持固定）
  effectiveHeight?: number; // 16:9游戏区域的有效高度（不包含黑边）
  isGameContainerCentered?: boolean; // 游戏容器是否居中显示
}

/**
 * 检查AI回复内容是否包含关键词，如果包含则返回对应的证物ID
 * 仅处理ID为11-15的证物
 */
const checkKeywordsAndGetEvidence = (response: string, actorName: string): string | null => {
  const mapping = responseKeywordMapping as Record<string, { 关键词: string[]; 证物ID: string }>;
  const characterMapping = mapping[actorName];
  
  if (!characterMapping) {
    return null;
  }
  
  const keywords = characterMapping.关键词;
  const evidenceId = characterMapping.证物ID;
  
  // 如果关键词数组为空，不进行匹配
  if (!keywords || keywords.length === 0) {
    return null;
  }
  
  // 检查回复内容是否包含任一关键词（不区分大小写）
  const responseLower = response.toLowerCase();
  const containsKeyword = keywords.some(keyword => 
    keyword && responseLower.includes(keyword.toLowerCase())
  );
  
  if (containsKeyword) {
    return evidenceId;
  }
  
  return null;
};

const sendChat = async (
  messages: LLMMessage[],
  setActors: (update: (all: Record<number, Actor>) => Record<number, Actor>) => void,
  globalStory: string,
  sessionId: string,
  actor: Actor,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  onMessageSent?: () => void,
  onEvidenceObtained?: (evidenceId: string) => void
) => {
  setLoading(true);
  const setActor = (a: Partial<Actor>) => {
    setActors((all) => {
      const newActors = { ...all };
      newActors[actor.id] = {
        ...newActors[actor.id],
        ...a,
      };
      return newActors;
    });
  };

  setActor({ messages });

  try {
    const data = await invokeAI({
      globalStory,
      sessionId,
      characterFileVersion: CHARACTER_DATA.fileKey,
      actor: {
        ...actor,
        messages,
      },
    });

    setActor({
      messages: [
        ...messages,
        {
          role: "assistant",
          content: data.final_response,
        },
      ],
    });
    
    // 检查回复内容是否包含关键词，如果包含则获取对应证物（仅针对ID 11-15）
    const evidenceId = checkKeywordsAndGetEvidence(data.final_response, actor.name);
    if (evidenceId && onEvidenceObtained) {
      // 只处理ID为11-15的证物
      const evidenceIdNum = parseInt(evidenceId, 10);
      if (evidenceIdNum >= 11 && evidenceIdNum <= 15) {
        onEvidenceObtained(evidenceId);
      }
    }
    
    // 消息发送成功后触发回调
    if (onMessageSent) {
      onMessageSent();
    }
  } catch (error) {
    console.error('API 调用失败:', error);
    setActor({
      messages: [
        ...messages,
        {
          role: "assistant",
          content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        },
      ],
    });
  } finally {
    setLoading(false);
  }
};

// 记录每个角色是否点击了"继续对话"（使用模块级变量，在组件实例间共享）
const continueDialogState = new Map<number, boolean>();

// 导出清除函数，用于外部清除角色的"继续对话"状态
export const clearContinueDialogState = (actorId: number) => {
  continueDialogState.set(actorId, false);
};

// 根据角色名称获取对应的loading语句
const getThinkingText = (actorName: string): string => {
  const thinkingTexts: Record<string, string> = {
    '樱羽艾玛': '少女思考中',
    '二阶堂希罗': '少女回想中',
    '夏目安安': '少女笔谈中',
    '城崎诺亚': '少女作画中',
    '莲见蕾雅': '少女演绎中',
    '佐伯米莉亚': '少女观影中',
    '黑部奈叶香': '少女潜行中',
    '紫藤亚里沙': '少女点火中',
    '橘雪莉': '少女推理中',
    '远野汉娜': '少女品茶中',
    '泽渡可可': '少女放送中',
    '冰上梅露露': '少女祈祷中',
  };
  
  return thinkingTexts[actorName] || '少女思考中';
};

const ActorChat = ({ actor, onMessageSent, onEvidenceObtained, scale = 1, standScale = 1, effectiveHeight, isGameContainerCentered = false }: Props) => {
  const [currMessage, setCurrMessage] = useState("");
  const { setActors, globalStory } = useMysteryContext();
  const [loading, setLoading] = useState(false);
  // 每个角色的输入模式状态单独管理（基于是否有回复来判断）
  // 如果角色有回复，则显示回复框；否则显示输入框
  const hasResponse = actor.messages.some(m => m.role === 'assistant');
  const [isInputMode, setIsInputMode] = useState(!hasResponse);
  const [isAnimating, setIsAnimating] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(1);
  const sessionId = useSessionContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 当切换角色或该角色的消息变化时，根据该角色是否有回复来更新输入模式
  // 注意：如果正在加载中，不要切换模式（避免在发送消息后立即切回输入框）
  // 如果用户点击了"继续对话"，即使有回复也显示输入框
  useEffect(() => {
    // 如果正在加载中，不切换模式
    if (loading) {
      return;
    }
    
    const hasResponse = actor.messages.some(m => m.role === 'assistant');
    const userClickedContinue = continueDialogState.get(actor.id) || false;
    // 如果用户点击了"继续对话"，或者没有回复，则显示输入框
    setIsInputMode(userClickedContinue || !hasResponse);
    // 如果切换到输入模式，清除动画状态和输入内容
    if (userClickedContinue || !hasResponse) {
      setIsAnimating(false);
      setCurrMessage("");
    }
  }, [actor.id, actor.messages.length, loading]);

  // 思考中的点循环动画
  useEffect(() => {
    if (loading && !isInputMode) {
      const interval = setInterval(() => {
        setThinkingDots((prev) => (prev % 3) + 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading, isInputMode]);

  const handleSendMessage = async () => {
    if (!currMessage.trim() || loading) return;

    const newMessage: LLMMessage = {
      role: "user",
      content: "二阶堂希罗: " + currMessage,
    };

    const messageToSend = currMessage;
    setCurrMessage("");
    setIsAnimating(true);
    // 发送新消息时，清除该角色的"继续对话"状态（因为会有新回复）
    continueDialogState.set(actor.id, false);

    // 等待背景层动画完成（0.5s），然后切换模式并发送消息
    setTimeout(async () => {
      setIsInputMode(false);
      setIsAnimating(false);
      await sendChat([...actor.messages, newMessage], setActors, globalStory, sessionId, actor, setLoading, onMessageSent, onEvidenceObtained);
    }, 500);
  };

  const handleInputClick = useCallback(() => {
    setIsAnimating(true);
    // 标记该角色点击了"继续对话"，即使有回复也显示输入框
    continueDialogState.set(actor.id, true);
    // 等待背景层动画完成（0.5s），然后切换模式
    setTimeout(() => {
      setIsInputMode(true);
      setIsAnimating(false);
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    }, 500);
  }, [actor.id]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // 只在输入框有内容时发送
      if (currMessage.trim()) {
        handleSendMessage();
      }
    }
  };

  // 获取最新的回复（最后一条assistant消息）
  const latestResponse = actor.messages.length > 0 
    ? (actor.messages.filter(m => m.role === 'assistant').pop()?.content || '')
    : '';

  // 全局键盘事件监听（用于回复框模式的Enter键）
  useEffect(() => {
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return; // 移动端不添加键盘监听
    }

    const handleGlobalKeyPress = (event: KeyboardEvent) => {
      // 如果焦点在输入框或其他可输入元素上，不处理
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement === textareaRef.current ||
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      )) {
        return;
      }

      // 如果按的是 Enter 键
      if (event.key === 'Enter' && !event.shiftKey) {
        // 回复框模式：有回复且不在加载中且不在动画中
        if (!isInputMode && !loading && !isAnimating && latestResponse) {
          event.preventDefault();
          handleInputClick();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyPress);
    };
  }, [isInputMode, loading, isAnimating, latestResponse, handleInputClick]);

  // 逐字显示的状态
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResponseRef = useRef<string>('');
  // 记录已经完成逐字显示的消息内容（用于切换角色后直接显示）
  const completedTypingRef = useRef<Set<string>>(new Set());

  // 检查最后一条assistant消息是否来自地图或证物交互
  const isFromMapOrEvidence = () => {
    if (actor.messages.length === 0) {
      return false;
    }
    
    const lastMessage = actor.messages[actor.messages.length - 1];
    
    // 最后一条必须是assistant消息
    if (lastMessage.role !== 'assistant') {
      return false;
    }
    
    // 如果该消息已经完成过逐字显示，不需要再次逐字显示
    if (completedTypingRef.current.has(lastMessage.content)) {
      return false;
    }
    
    // 如果只有一条消息，且是assistant消息，可能是地图点击（直接添加assistant）
    if (actor.messages.length === 1) {
      return true;
    }
    
    const secondLastMessage = actor.messages[actor.messages.length - 2];
    
    // 如果前一条是user消息，且内容以"（出示"开头，则是证物出示
    if (secondLastMessage.role === 'user' && secondLastMessage.content.startsWith('（出示')) {
      return true; // 证物出示
    }
    
    // 如果前一条也是assistant消息，可能是地图点击（直接添加assistant，没有user消息）
    // 但需要排除AI回复的情况：AI回复前一条应该是user消息（但不是以"（出示"开头）
    // 如果前一条是assistant消息，且最后一条assistant消息还没有完成过逐字显示，可能是地图点击
    if (secondLastMessage.role === 'assistant') {
      return true; // 可能是地图点击
    }
    
    return false;
  };

  // 逐字显示效果（仅对地图和证物交互生效）
  useEffect(() => {
    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 如果正在加载，不显示逐字效果
    if (loading) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // 如果没有回复，清空显示
    if (!latestResponse) {
      setDisplayedText('');
      setIsTyping(false);
      lastResponseRef.current = '';
      return;
    }

    // 检查是否来自地图或证物交互
    const shouldTypewriter = isFromMapOrEvidence();
    
    // 如果不是来自地图或证物交互，直接显示完整内容
    if (!shouldTypewriter) {
      setDisplayedText(latestResponse);
      setIsTyping(false);
      lastResponseRef.current = latestResponse;
      return;
    }

    // 如果该消息已经完成过逐字显示，直接显示完整内容
    if (completedTypingRef.current.has(latestResponse)) {
      setDisplayedText(latestResponse);
      setIsTyping(false);
      lastResponseRef.current = latestResponse;
      return;
    }

    // 如果回复内容没有变化，不需要重新逐字显示
    if (lastResponseRef.current === latestResponse) {
      return;
    }

    // 回复内容发生变化，重新开始逐字显示
    lastResponseRef.current = latestResponse;
    setIsTyping(true);
    setDisplayedText('');

    let currentIndex = 0;
    const typeNextChar = () => {
      // 检查回复内容是否仍然是最新的（防止在显示过程中回复内容改变）
      if (lastResponseRef.current !== latestResponse) {
        return;
      }
      
      if (currentIndex < latestResponse.length) {
        setDisplayedText(latestResponse.slice(0, currentIndex + 1));
        currentIndex++;
        // 根据字符类型调整速度：中文字符稍慢，标点符号稍慢
        const char = latestResponse[currentIndex - 1];
        let delay: number;
        
        // 句末标点符号（问号、句号、感叹号、省略号）需要额外停顿
        if (/[。！？]/.test(char) || (char === '…' || char === '...')) {
          delay = 130; // 句末标点符号额外停顿200ms
        } else if (/[，、；：]/.test(char)) {
          delay = 130; // 其他标点符号
        } else if (/[\u4e00-\u9fa5]/.test(char)) {
          delay = 40; // 中文字符
        } else {
          delay = 30; // 其他字符
        }
        
        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // 逐字显示完成，标记该消息已完成
        setIsTyping(false);
        completedTypingRef.current.add(latestResponse);
      }
    };

    // 延迟一点开始显示，让动画更自然
    typingTimeoutRef.current = setTimeout(typeNextChar, 150);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [latestResponse, loading, actor.messages]);

  // 思考中的文本（根据角色名称获取对应的loading语句）
  const thinkingText = getThinkingText(actor.name) + '.'.repeat(thinkingDots);

  // 获取名字图片（玩家角色）
  const nameImageSrc = getNameImageSrc();
  
  // 获取角色名称图片和位置配置
  const characterNameImageSrc = getCharacterNameImage(actor.image);
  const namePosition = getNamePosition(actor.image);

  return (
    <>
      {/* 玩家角色名字图片 - 对话框外部左上角（仅输入框模式） */}
      {nameImageSrc && isInputMode && (
        <div
          style={{
            position: 'fixed',
            // 输入框模式：在输入框上方，左上角对齐
            // 使用有效高度而不是100vh，避免黑边影响
            // 如果游戏容器居中，需要相对于游戏容器底部计算
            top: effectiveHeight 
              ? (isGameContainerCentered
                  ? `calc(50% + ${effectiveHeight / 2 - 240 * standScale}px)`
                  : `${effectiveHeight - 240 * standScale}px`)
              : `calc(100vh - ${240 * standScale}px)`,
            left: `calc(50% - ${470 * standScale}px)`,
            zIndex: 11,
            pointerEvents: 'none',
            opacity: isAnimating ? 0 : 1,
            transition: 'opacity 0.1s ease-out',
          }}
        >
          <Image
            src={nameImageSrc}
            alt="角色名字"
            style={{
              maxHeight: `${100 * standScale}px`,
              maxWidth: `${250 * standScale}px`,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* 角色名称图片 - 回复框外部左上方（仅回复框模式） */}
      {characterNameImageSrc && !isInputMode && (
        <div
          style={{
            position: 'fixed',
            top: namePosition.top 
              ? (typeof namePosition.top === 'number'
                  ? `${namePosition.top * standScale}px`
                  : namePosition.top.includes('calc')
                    ? (() => {
                        // 解析 calc() 表达式，例如 "calc(50% - 200px)" -> "calc(50% - ${200 * standScale}px)"
                        const calcMatch = namePosition.top.match(/calc\((.+)\)/);
                        if (calcMatch) {
                          const content = calcMatch[1];
                          // 替换所有 px 值
                          const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                            return `${parseFloat(num) * standScale}px`;
                          });
                          return `calc(${scaledContent})`;
                        }
                        return namePosition.top;
                      })()
                    : namePosition.top.includes('%') || namePosition.top.includes('vw') || namePosition.top.includes('vh')
                      ? namePosition.top
                      : `${parseFloat(String(namePosition.top)) * standScale}px`)
              : undefined,
            left: namePosition.left
              ? (typeof namePosition.left === 'number'
                  ? `${namePosition.left * standScale}px`
                  : namePosition.left.includes('calc')
                    ? (() => {
                        const calcMatch = namePosition.left.match(/calc\((.+)\)/);
                        if (calcMatch) {
                          const content = calcMatch[1];
                          const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                            return `${parseFloat(num) * standScale}px`;
                          });
                          return `calc(${scaledContent})`;
                        }
                        return namePosition.left;
                      })()
                    : namePosition.left.includes('%') || namePosition.left.includes('vw') || namePosition.left.includes('vh')
                      ? namePosition.left
                      : `${parseFloat(String(namePosition.left)) * standScale}px`)
              : undefined,
            right: namePosition.right
              ? (typeof namePosition.right === 'number'
                  ? `${namePosition.right * standScale}px`
                  : namePosition.right.includes('calc')
                    ? (() => {
                        const calcMatch = namePosition.right.match(/calc\((.+)\)/);
                        if (calcMatch) {
                          const content = calcMatch[1];
                          const scaledContent = content.replace(/([\d.]+)px/g, (match, num) => {
                            return `${parseFloat(num) * standScale}px`;
                          });
                          return `calc(${scaledContent})`;
                        }
                        return namePosition.right;
                      })()
                    : namePosition.right.includes('%') || namePosition.right.includes('vw') || namePosition.right.includes('vh')
                      ? namePosition.right
                      : `${parseFloat(String(namePosition.right)) * standScale}px`)
              : undefined,
            transform: namePosition.transform,
            zIndex: 11,
            pointerEvents: 'none',
            opacity: isAnimating ? 0 : 1,
            transition: 'opacity 0.1s ease-out',
          }}
        >
          <Image
            src={characterNameImageSrc}
            alt={actor.name}
            style={{
              maxHeight: namePosition.maxHeight 
                ? (typeof namePosition.maxHeight === 'number'
                    ? `${namePosition.maxHeight * standScale}px`
                    : namePosition.maxHeight.includes('vh')
                      ? `${(parseFloat(String(namePosition.maxHeight)) * 746 / 100) * standScale}px`
                      : namePosition.maxHeight.includes('vw')
                        ? `${(parseFloat(String(namePosition.maxHeight)) * 1136 / 100) * standScale}px`
                        : `${parseFloat(String(namePosition.maxHeight)) * standScale}px`)
                : `${80 * standScale}px`,
              maxWidth: namePosition.maxWidth
                ? (typeof namePosition.maxWidth === 'number'
                    ? `${namePosition.maxWidth * standScale}px`
                    : namePosition.maxWidth.includes('vw')
                      ? `${(parseFloat(String(namePosition.maxWidth)) * 1136 / 100) * standScale}px`
                      : namePosition.maxWidth.includes('vh')
                        ? `${(parseFloat(String(namePosition.maxWidth)) * 746 / 100) * standScale}px`
                        : `${parseFloat(String(namePosition.maxWidth)) * standScale}px`)
                : `${200 * standScale}px`,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* 统一的背景层 - 负责动画移动，宽度和高度独立变化 */}
      <div
        style={{
          position: 'fixed',
          bottom: (isInputMode && !isAnimating) || (!isInputMode && isAnimating) ? `${20 * scale}px` : 'auto',
          top: (!isInputMode && !isAnimating) || (isInputMode && isAnimating) ? `calc(68% - ${10 * scale}px)` : 'auto',
          left: '50%',
          transform: (isInputMode && !isAnimating) || (!isInputMode && isAnimating) ? 'translateX(-50%)' : 'translate(-50%, -50%)',
          width: (isInputMode && !isAnimating) || (!isInputMode && isAnimating) ? '80%' : '45%',
          maxWidth: (isInputMode && !isAnimating) || (!isInputMode && isAnimating) ? `${800 * scale}px` : `${600 * scale}px`,
          height: (isInputMode && !isAnimating) || (!isInputMode && isAnimating) ? `${140 * scale}px` : `${180 * scale}px`,
          zIndex: 9,
          transition: isAnimating ? 'all 0.5s ease-in-out' : 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: `${15 * scale}px`,
            borderRadius: `${12 * scale}px`,
            boxShadow: `0 ${4 * scale}px ${12 * scale}px rgba(0, 0, 0, 0.3)`,
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 输入框内容层 - 透明背景，只显示内容 */}
      {isInputMode && (
        <div
          ref={containerRef}
          style={{
            position: 'fixed',
            bottom: `${20 * scale}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${(800 / BASE_WIDTH) * 100}vw`, // 基于基准宽度的相对宽度
            maxWidth: `${800 * scale}px`, // 保持最大宽度限制
            zIndex: 10,
            opacity: isAnimating ? 0 : 1,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: isAnimating ? 'none' : 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: `${10 * scale}px`,
              alignItems: 'flex-end',
              backgroundColor: 'transparent',
              padding: `${15 * scale}px`,
            }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <style>{`
                .input-textarea::placeholder {
                  color: rgba(255, 255, 255, 0.6) !important;
                }
              `}</style>
              <Textarea
                ref={textareaRef}
                placeholder={`与${actor.name}对话...`}
                onChange={(event) => {
                  setCurrMessage(event.currentTarget.value);
                }}
                value={currMessage}
                onKeyPress={handleKeyPress}
                autosize
                minRows={4}
                maxRows={5}
                className="input-textarea"
                styles={{
                  input: {
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: `${16 * scale}px`,
                    lineHeight: '1.5',
                    resize: 'none',
                    color: 'white',
                    width: '100%',
                  },
                }}
              />
            </div>
            <Button
              disabled={loading || !currMessage.trim()}
              onClick={handleSendMessage}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                height: 'fit-content',
                padding: `${10 * scale}px ${20 * scale}px`,
                flexShrink: 0,
                fontSize: `${14 * scale}px`,
              }}
            >
              发送
            </Button>
          </div>
        </div>
      )}

      {/* 回复框内容层 - 透明背景，只显示内容 */}
      {!isInputMode && (
        <div
          style={{
            position: 'fixed',
            top: `calc(68% - ${10 * scale}px)`,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${(600 / BASE_WIDTH) * 100}vw`, // 基于基准宽度的相对宽度
            maxWidth: `${600 * scale}px`, // 保持最大宽度限制
            zIndex: 10,
            opacity: isAnimating ? 0 : 1,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: isAnimating ? 'none' : 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: 'transparent',
              padding: `${20 * scale}px ${15 * scale}px ${15 * scale}px ${20 * scale}px`,
              minHeight: `${200 * scale}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                fontSize: `${18 * scale}px`,
                lineHeight: '1.8',
                color: 'white',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: loading ? '0' : `${10 * scale}px`,
                marginTop: `${5 * scale}px`,
              }}
            >
              {loading ? thinkingText : (isTyping ? displayedText : latestResponse)}
            </div>
            {/* 继续对话按钮（当有回复且不在加载中时显示） */}
            {!loading && !isAnimating && latestResponse && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  transform: `translateY(-${10 * scale}px)`,
                }}
              >
                <Button
                  onClick={handleInputClick}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    height: 'fit-content',
                    padding: `${10 * scale}px ${20 * scale}px`,
                    flexShrink: 0,
                    fontSize: `${14 * scale}px`,
                  }}
                >
                  继续对话
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export { sendChat };
export default ActorChat;
