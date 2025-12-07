import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { AppShell, Button, Textarea, ActionIcon, Image, Group, ScrollArea } from '@mantine/core';
import ActorSidebar from '../components/ActorSidebar';
import ActorChat, { sendChat, clearContinueDialogState } from '../components/Actor';
import IntroModal from '../components/IntroModal';
import EndModal from '../components/EndModal';
import HelpModal from '../components/HelpModal';
import { Actor, LLMMessage, useMysteryContext } from '../providers/mysteryContext';
import { useSessionContext } from '../providers/sessionContext';
import MultipleChoiceGame from '../components/MultipleChoiceGame';
import { getStandPosition } from '../config/characterStandPositions';
import { findRegionByClick, MapRegion } from '../config/mapRegions';
import { EvidenceDisplay } from '../components/EvidenceDisplay';
import { initialEvidence, obtainEvidence, Evidence } from '../config/evidence';
import { preloadAllImages, preloadPriorityImages } from '../utils/imagePreloader';
import { saveGameProgress, loadGameProgress, hasGameProgress } from '../utils/gameStorage';

// 背景图片列表（01.avif 到 48.avif）
const BG_IMAGES = Array.from({ length: 48 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return `bg/${num}.avif`;
});

// 获取随机背景图片
const getRandomBg = () => {
  return BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)];
};

// 根据头像文件名和context状态获取立绘文件名
const getStandImage = (avatarFileName: string, actor?: { context1?: string; context2?: string; context3?: string; context4?: string; lastcontext?: string }, forcedVariant?: string | null): string | null => {
  // 去掉扩展名，获取基础名称
  const baseName = avatarFileName.replace(/\.(jpg|jpeg|png)$/i, '');
  
  // 如果提供了强制变体（由出示证物触发），直接使用
  if (forcedVariant !== undefined && forcedVariant !== null) {
    if (forcedVariant === '') {
      return `character_stand/${baseName}.webp`; // 基础立绘
    }
    return `character_stand/${baseName}${forcedVariant}.webp`;
  }
  
  // 如果没有强制变体，根据context状态来决定使用哪个立绘变体
  if (actor) {
    const context1 = actor.context1 || '';
    const context2 = actor.context2 || '';
    const context3 = actor.context3 || '';
    const context4 = actor.context4 || '';
    const lastcontext = actor.lastcontext || '';
    
    // 如果 lastcontext 存在且已添加到 context1，使用它
    if (lastcontext.trim() !== '' && context1.includes(lastcontext.trim())) {
      return `character_stand/${baseName}_l.webp`;
    }
    
    // 对于 context2、context3、context4，使用最后添加的那个（在 context1 中最后出现的）
    // 由于 context 是追加到 context1 末尾的，最后出现的那个就是最后添加的
    const contextPositions: Array<{ context: string; variant: string; position: number }> = [];
    
    if (context2.trim() !== '') {
      const pos = context1.lastIndexOf(context2.trim());
      if (pos !== -1) {
        contextPositions.push({ context: context2.trim(), variant: '_2', position: pos });
      }
    }
    
    if (context3.trim() !== '') {
      const pos = context1.lastIndexOf(context3.trim());
      if (pos !== -1) {
        contextPositions.push({ context: context3.trim(), variant: '_3', position: pos });
      }
    }
    
    if (context4.trim() !== '') {
      const pos = context1.lastIndexOf(context4.trim());
      if (pos !== -1) {
        contextPositions.push({ context: context4.trim(), variant: '_4', position: pos });
      }
    }
    
    // 如果找到了任何已添加的 context，选择位置最靠后的（最后添加的）
    if (contextPositions.length > 0) {
      // 按位置排序，选择最后出现的
      contextPositions.sort((a, b) => b.position - a.position);
      return `character_stand/${baseName}${contextPositions[0].variant}.webp`;
    }
  }
  
  // 默认返回基础立绘文件路径
  return `character_stand/${baseName}.webp`;
};

// 背景图片缓存
const bgImageCache: Record<string, string> = {};

// 预加载所有背景图片
const preloadBgImages = () => {
  BG_IMAGES.forEach(bgPath => {
    if (!bgImageCache[bgPath]) {
      try {
        bgImageCache[bgPath] = require(`../assets/${bgPath}`);
      } catch {
        // 如果图片不存在，使用默认背景
        if (!bgImageCache[bgPath]) {
          try {
            bgImageCache[bgPath] = require('../assets/bg/01.avif');
          } catch {
            bgImageCache[bgPath] = '';
          }
        }
      }
    }
  });
};

// 获取背景图片的require路径（从缓存中获取）
const getBgImageSrc = (bgPath: string) => {
  // 如果缓存中有，直接返回
  if (bgImageCache[bgPath]) {
    return bgImageCache[bgPath];
  }
  // 如果缓存中没有，尝试加载并缓存
  try {
    const src = require(`../assets/${bgPath}`);
    bgImageCache[bgPath] = src;
    return src;
  } catch {
    // 如果图片不存在，返回默认背景
    try {
      const defaultBg = require('../assets/bg/01.avif');
      bgImageCache[bgPath] = defaultBg;
      return defaultBg;
    } catch {
      bgImageCache[bgPath] = '';
      return '';
    }
  }
};

// 立绘图片缓存
const standImageCache: Record<string, string | null> = {};

// 预加载所有立绘图片（包括所有变体）
const preloadStandImages = () => {
  // 所有角色的图片文件名（从 characters.json 中获取）
  const characterImages = [
    'ema.jpg', 'hiro.jpg', 'anan.jpg', 'noa.jpg', 'leia.jpg', 
    'milia.jpg', 'nanoka.jpg', 'arisa.jpg', 'sherry.jpg', 
    'hanna.jpg', 'koko.jpg', 'meruru.jpg'
  ];
  
  // 立绘变体后缀
  const standVariants = ['', '_2', '_3', '_4', '_l'];
  
  characterImages.forEach(imageFile => {
    const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
    
    // 预加载所有变体（基础、_2、_3、_l）
    standVariants.forEach(variant => {
      const standPath = `character_stand/${baseName}${variant}.webp`;
      if (!standImageCache[standPath]) {
        try {
          standImageCache[standPath] = require(`../assets/${standPath}`);
        } catch {
          standImageCache[standPath] = null;
        }
      }
    });
  });
};

// 获取立绘图片的require路径（从缓存中获取）
const getStandImageSrc = (standPath: string) => {
  if (standImageCache[standPath] !== undefined) {
    return standImageCache[standPath];
  }
  // 如果缓存中没有，尝试加载并缓存
  try {
    const src = require(`../assets/${standPath}`);
    standImageCache[standPath] = src;
    return src;
  } catch {
    standImageCache[standPath] = null;
    return null;
  }
};

// 地图图片列表（按顺序：map_2, map_1, map_b1）
const MAP_IMAGES = ['map/map_2.webp', 'map/map_1.webp', 'map/map_b1.webp'];

// 获取证物图片路径
const getEvidenceImageSrc = () => {
  try {
    return require('../assets/evidence/bg.webp');
  } catch {
    return null;
  }
};

// 获取通知背景图片路径
const getNotificationBgSrc = () => {
  try {
    return require('../assets/ui/get.webp');
  } catch {
    return null;
  }
};

// 获取证物物品图片路径
const getEvidenceItemImageSrc = (imageFileName: string): string | null => {
  try {
    return require(`../assets/evidence/${imageFileName}`);
  } catch {
    return null;
  }
};

// 获取bg1.png图片路径
const getBg1ImageSrc = () => {
  try {
    return require('../assets/ui/bg1.webp');
  } catch {
    return null;
  }
};

// 获取地图图片的require路径
const getMapImageSrc = (mapPath: string) => {
  try {
    return require(`../assets/${mapPath}`);
  } catch {
    return null;
  }
};

// 获取历史背景图片
const getHistoryBgSrc = () => {
  try {
    return require('../assets/history/bg.webp');
  } catch {
    return null;
  }
};

// 获取玩家名字图片
const getPlayerNameImageSrc = () => {
  try {
    return require('../assets/character_name/name.webp');
  } catch {
    return null;
  }
};

// 根据角色头像文件名获取角色名称图片路径（复用Actor.tsx中的逻辑）
const getCharacterNameImageSrc = (avatarFileName: string): string | null => {
  let baseName = avatarFileName.replace(/\.(jpg|jpeg|png)$/i, '');
  const nameMapping: Record<string, string> = {
    'arisa': 'alisa',
  };
  const mappedName = nameMapping[baseName] || baseName;
  const nameImagePath = `character_name/n_${mappedName}.png`;
  try {
    return require(`../assets/${nameImagePath}`);
  } catch {
    return null;
  }
};

// 检测是否为移动设备或平板
const isMobileDevice = (): boolean => {
  // 检测用户代理
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  
  // 检测屏幕尺寸（平板通常宽度小于1024px）
  const isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 1024;
  
  // 检测触摸支持
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 如果满足任一条件，认为是移动设备
  return isMobileUA || (isSmallScreen && hasTouchScreen);
};

export default function Home() {
  const { actors, setActors, globalStory, setGlobalStory } = useMysteryContext(); 
  const [currActor, setCurrActor] = useState<number>(0);
  const [introModalOpened, setIntroModalOpened] = useState(true);
  const [endModalOpened, setEndModalOpened] = useState(false);
  const [helpModalOpened, setHelpModalOpened] = useState(false);
  const [actionCountdown, setActionCountdown] = useState<number>(658); 
  const [endGame, setEndGame] = useState(false);
  const [countdownEnded, setCountdownEnded] = useState(false); // 标记倒计时是否结束
  const [notesWidth, setNotesWidth] = useState<number>(300); // 笔记框宽度（基于scale计算，会在useEffect中更新）
  const [postGame, setPostGame] = useState(false);
  const [hasEffectRun, setHasEffectRun] = useState(false);
  const [filteredActors, setFilteredActors] = useState<Actor[]>(Object.values(actors));
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Array<{ id: number; content: string }>>([
    { id: 0, content: "" },
    { id: 1, content: "" },
    { id: 2, content: "" }
  ]);
  const nextNoteId = useRef(3);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const historyBgImageRef = useRef<HTMLImageElement>(null);
  const sessionId = useSessionContext();
  const [bgImage, setBgImage] = useState<string>('bg/01.avif');
  const [recentBgImages, setRecentBgImages] = useState<string[]>([]); // 跟踪最近7次使用的背景
  const [standJump, setStandJump] = useState<number>(0); // 立绘跳跃动画计数器
  const [showMap, setShowMap] = useState<boolean>(false); // 是否显示地图
  const [currentMapIndex, setCurrentMapIndex] = useState<number>(1); // 当前地图索引：0=map_2, 1=map_1, 2=map_b1
  const [showHistory, setShowHistory] = useState<boolean>(false); // 是否显示历史对话
  const [showEvidence, setShowEvidence] = useState<boolean>(false); // 是否显示证物
  // 历史背景图片的实际显示位置和尺寸
  const [historyBgImageLayout, setHistoryBgImageLayout] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth > window.innerHeight); // 检测是否为横屏
  const [isMobile, setIsMobile] = useState<boolean>(false); // 检测是否为移动设备
  // 通知状态：证物更新和证言更新
  const [showEvidenceUpdate, setShowEvidenceUpdate] = useState<boolean>(false);
  const [showContextUpdate, setShowContextUpdate] = useState<boolean>(false);
  const [newEvidenceImage, setNewEvidenceImage] = useState<string | null>(null); // 新获得的证物图片文件名
  const [currentStandVariant, setCurrentStandVariant] = useState<string | null>(null); // 当前立绘变体（_2, _3, _4, _l 或 null 表示基础立绘）
  // 基准尺寸：1136x746
  const BASE_WIDTH = 1136;
  const BASE_HEIGHT = 746;
  // 16:9 宽高比限制
  const ASPECT_RATIO = 16 / 9;
  // 计算初始缩放比例（基于16:9区域的有效尺寸）
  const initialWidth = window.innerWidth;
  const initialHeight = window.innerHeight;
  const initialAspectRatio = initialWidth / initialHeight;
  // 计算16:9区域的有效高度（不包含黑边）
  const initialEffectiveHeight = initialAspectRatio < ASPECT_RATIO 
    ? initialWidth / ASPECT_RATIO  // 宽高比小于16:9，使用计算出的高度
    : initialHeight;  // 宽高比大于等于16:9，使用实际高度
  
  const initialScaleX = initialWidth / BASE_WIDTH;
  const initialScaleY = initialEffectiveHeight / BASE_HEIGHT;
  const initialScale = Math.min(initialScaleX, initialScaleY);
  const [scale, setScale] = useState<number>(initialScale); // 缩放比例
  // 立绘专用缩放比例：基于16:9区域的有效高度计算，之后固定不变
  const [standScale] = useState<number>(initialEffectiveHeight / BASE_HEIGHT);
  // 16:9游戏区域的有效高度（用于名称图片定位，不包含黑边）
  const [effectiveHeight, setEffectiveHeight] = useState<number>(initialEffectiveHeight);
  // 游戏容器是否居中显示（宽高比小于16:9时居中）
  const [isGameContainerCentered, setIsGameContainerCentered] = useState<boolean>(
    initialAspectRatio < ASPECT_RATIO
  );
  const [gameContainerStyle, setGameContainerStyle] = useState<React.CSSProperties>(() => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const currentAspectRatio = currentWidth / currentHeight;
    
    if (currentAspectRatio < ASPECT_RATIO) {
      // 宽高比小于16:9，限制高度并居中显示
      const targetHeight = currentWidth / ASPECT_RATIO;
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${currentWidth}px`,
        height: `${targetHeight}px`,
        maxWidth: '100vw',
        maxHeight: '100vh',
        overflow: 'hidden',
        zIndex: 1,
      };
    } else {
      // 宽高比大于等于16:9，正常全屏显示
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      };
    }
  });
  const [evidenceList, setEvidenceList] = useState<Evidence[]>(() => 
    initialEvidence.map(e => ({ ...e })) // 深拷贝，确保每次都是新的数组实例
  ); // 证物列表
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null); // 当前选中的证物
  
  // 标记是否已经恢复过游戏状态，避免重复恢复
  const hasRestoredRef = useRef(false);

  // 组件挂载时恢复游戏进度
  useEffect(() => {
    if (hasRestoredRef.current) return;
    
    const savedState = loadGameProgress();
    if (savedState) {
      // 恢复对话历史和全局故事
      if (savedState.actors) {
        setActors(savedState.actors);
        setFilteredActors(Object.values(savedState.actors));
      }
      if (savedState.globalStory) {
        setGlobalStory(savedState.globalStory);
      }
      
      // 恢复游戏状态
      if (savedState.actionCountdown !== undefined) {
        setActionCountdown(savedState.actionCountdown);
      }
      if (savedState.endGame !== undefined) {
        setEndGame(savedState.endGame);
      }
      if (savedState.postGame !== undefined) {
        setPostGame(savedState.postGame);
      }
      if (savedState.countdownEnded !== undefined) {
        setCountdownEnded(savedState.countdownEnded);
      }
      if (savedState.currActor !== undefined) {
        setCurrActor(savedState.currActor);
      }
      
      // 恢复证物和笔记
      if (savedState.evidenceList) {
        setEvidenceList(savedState.evidenceList);
      }
      if (savedState.notes) {
        setNotes(savedState.notes);
      }
      if (savedState.nextNoteId !== undefined) {
        nextNoteId.current = savedState.nextNoteId;
      }
      
      // 恢复UI状态
      if (savedState.bgImage) {
        setBgImage(savedState.bgImage);
      }
      if (savedState.currentMapIndex !== undefined) {
        setCurrentMapIndex(savedState.currentMapIndex);
      }
      
      // 如果有保存的进度，不显示介绍模态框
      setIntroModalOpened(false);
      
      hasRestoredRef.current = true;
    } else {
      hasRestoredRef.current = true;
    }
  }, []); // 只在组件挂载时执行一次

  // 自动保存游戏进度（当关键状态变化时）
  useEffect(() => {
    if (!hasRestoredRef.current) return; // 等待恢复完成后再开始保存
    
    saveGameProgress({
      actors,
      globalStory,
      actionCountdown,
      endGame,
      postGame,
      countdownEnded,
      currActor,
      evidenceList,
      notes,
      nextNoteId: nextNoteId.current,
      bgImage,
      currentMapIndex,
    });
  }, [actors, globalStory, actionCountdown, endGame, postGame, countdownEnded, currActor, evidenceList, notes, bgImage, currentMapIndex]);

  // 监听倒计时，当为0时执行结束游戏逻辑
  useEffect(() => {
    if (actionCountdown === 0 && !endGame && !countdownEnded) {
      setCountdownEnded(true);
      // 切换背景为12.png
      setBgImage('bg/12.avif');
      // 切换到希罗的角色（立绘会自动切换为hiro.png）
      const hiro = Object.values(actors).find(actor => actor.name === '二阶堂希罗');
      if (hiro) {
        setCurrActor(hiro.id);
      }
      setEndGame(true);
    }
  }, [actionCountdown, endGame, countdownEnded, actors]);

  // 组件挂载时预加载所有图片（按优先级）
  useEffect(() => {
    // 保留原有的缓存机制
    preloadStandImages();
    preloadBgImages();
    
    // 收集图片路径（按新的分类方式）
    const characterImages = [
      'ema.jpg', 'hiro.jpg', 'anan.jpg', 'noa.jpg', 'leia.jpg', 
      'milia.jpg', 'nanoka.jpg', 'arisa.jpg', 'sherry.jpg', 
      'hanna.jpg', 'koko.jpg', 'meruru.jpg'
    ];
    
    // 收集基础立绘（不带下划线的）
    const collectBaseStandImages = (): string[] => {
      const urls: string[] = [];
      characterImages.forEach(imageFile => {
        const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
        const standPath = `character_stand/${baseName}.webp`;
        try {
          const src = require(`../assets/${standPath}`);
          if (src) urls.push(src);
        } catch {
          // 忽略不存在的图片
        }
      });
      return urls;
    };
    
    // 收集立绘变体（带下划线的）
    const collectStandVariants = (): string[] => {
      const urls: string[] = [];
      const standVariants = ['_2', '_3', '_4', '_l'];
      characterImages.forEach(imageFile => {
        const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
        standVariants.forEach(variant => {
          const standPath = `character_stand/${baseName}${variant}.webp`;
          try {
            const src = require(`../assets/${standPath}`);
            if (src) urls.push(src);
          } catch {
            // 忽略不存在的图片
          }
        });
      });
      return urls;
    };
    
    // 收集背景图片（按顺序）
    const collectBgImageUrls = (): string[] => {
      const urls: string[] = [];
      BG_IMAGES.forEach(bgPath => {
        try {
          const src = require(`../assets/${bgPath}`);
          if (src) urls.push(src);
        } catch {
          // 忽略不存在的图片
        }
      });
      return urls;
    };
    
    // 按目录分类收集其他图片
    const collectOtherImagesByCategory = () => {
      const map: string[] = [];
      const ui: string[] = [];
      const evidence: string[] = [];
      const character_name: string[] = [];
      const character_avatars: string[] = [];
      const history: string[] = [];
      
      // 地图图片
      MAP_IMAGES.forEach(mapPath => {
        try {
          const src = require(`../assets/${mapPath}`);
          if (src) map.push(src);
        } catch {}
      });
      
      // UI 图片
      const uiImages = ['ui/get.webp', 'ui/bg1.webp', 'ui/1.webp', 'ui/2.webp'];
      uiImages.forEach(path => {
        try {
          const src = require(`../assets/${path}`);
          if (src) ui.push(src);
        } catch {}
      });
      
      // 证物图片（包括背景）
      for (let i = 1; i <= 15; i++) {
        const num = String(i).padStart(2, '0');
        try {
          const src = require(`../assets/evidence/${num}.webp`);
          if (src) evidence.push(src);
        } catch {}
      }
      try {
        const src = require('../assets/evidence/bg.webp');
        if (src) evidence.push(src);
      } catch {}
      try {
        const src = require('../assets/evidence/bg1.webp');
        if (src) evidence.push(src);
      } catch {}
      
      // 角色名称图片
      const characterNames = ['name', 'n_ema', 'n_hiro', 'n_anan', 'n_noa', 'n_leia', 
        'n_milia', 'n_nanoka', 'n_arisa', 'n_sherry', 'n_hanna', 'n_koko', 'n_meruru', 'n_alisa', 'n_mage'];
      characterNames.forEach(name => {
        try {
          const src = require(`../assets/character_name/${name}.webp`);
          if (src) character_name.push(src);
        } catch {}
      });
      
      // 角色头像
      characterImages.forEach(imageFile => {
        const baseName = imageFile.replace(/\.(jpg|jpeg|png)$/i, '');
        try {
          const src = require(`../assets/character_avatars/${baseName}.webp`);
          if (src) character_avatars.push(src);
        } catch {}
      });
      
      // 历史背景
      try {
        const src = require('../assets/history/bg.webp');
        if (src) history.push(src);
      } catch {}
      try {
        const src = require('../assets/history/bg1.webp');
        if (src) history.push(src);
      } catch {}
      
      return { map, ui, evidence, character_name, character_avatars, history };
    };
    
    // 第一步：优先加载首屏背景 01.avif 和立绘 ema
    const initialImages: string[] = [];
    
    // 加载首屏背景 01.avif
    try {
      const bg01Src = require('../assets/bg/01.avif');
      if (bg01Src) initialImages.push(bg01Src);
    } catch {
      // 忽略加载失败的图片
    }
    
    // 加载立绘 ema（基础立绘）
    try {
      const emaStandSrc = require('../assets/character_stand/ema.webp');
      if (emaStandSrc) initialImages.push(emaStandSrc);
    } catch {
      // 忽略加载失败的图片
    }
    
    // 收集所有图片
    const baseStandUrls = collectBaseStandImages();
    const bgUrls = collectBgImageUrls();
    const standVariants = collectStandVariants();
    const otherImagesByCategory = collectOtherImagesByCategory();
    
    // 优先加载首屏图片，然后再开始队列预加载
    if (initialImages.length > 0) {
      preloadPriorityImages(initialImages).then(() => {
        // 首屏图片加载完成后再开始队列预加载
        preloadAllImages(
          baseStandUrls,
          bgUrls,
          {
            ...otherImagesByCategory,
            character_stand_variants: standVariants,
          }
        ).catch(err => {
          console.warn('图片预加载过程中出现错误:', err);
        });
      }).catch(() => {
        // 即使优先加载失败，也继续队列预加载
        preloadAllImages(
          baseStandUrls,
          bgUrls,
          {
            ...otherImagesByCategory,
            character_stand_variants: standVariants,
          }
        ).catch(err => {
          console.warn('图片预加载过程中出现错误:', err);
        });
      });
    } else {
      // 如果没有首屏图片，直接开始队列预加载
      preloadAllImages(
        baseStandUrls,
        bgUrls,
        {
          ...otherImagesByCategory,
          character_stand_variants: standVariants,
        }
      ).catch(err => {
        console.warn('图片预加载过程中出现错误:', err);
      });
    }
    
    // 检测是否为移动设备
    setIsMobile(isMobileDevice());
  }, []);

  // 优先加载当前背景图片
  useEffect(() => {
    if (bgImage) {
      try {
        const bgSrc = require(`../assets/${bgImage}`);
        if (bgSrc) {
          preloadPriorityImages([bgSrc]).catch(() => {});
        }
      } catch {
        // 忽略加载失败的图片
      }
    }
  }, [bgImage]);

  // 优先加载当前地图图片
  useEffect(() => {
    if (showMap) {
      const mapPath = MAP_IMAGES[currentMapIndex];
      try {
        const mapSrc = require(`../assets/${mapPath}`);
        if (mapSrc) {
          preloadPriorityImages([mapSrc]).catch(() => {});
        }
      } catch {
        // 忽略加载失败的图片
      }
    }
  }, [showMap, currentMapIndex]);

  // 计算笔记框宽度和位置（根据屏幕尺寸自适应，确保16:9时不重叠）
  useEffect(() => {
    const calculateNotesWidth = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const aspectRatio = screenWidth / screenHeight;
      const sidebarWidth = 200 * scale;
      
      // 输入框宽度：基于基准宽度的vw或固定px（取较小值）
      const inputBoxWidthVw = (800 / BASE_WIDTH) * 100; // 约70.42vw
      const inputBoxWidthPx = 800 * scale;
      const inputBoxWidth = Math.min((inputBoxWidthVw / 100) * screenWidth, inputBoxWidthPx);
      
      // 输入框居中，右边缘位置 = screenWidth/2 + inputBoxWidth/2
      const inputBoxRightEdge = screenWidth / 2 + inputBoxWidth / 2;
      
      // 在16:9比例下，确保笔记框和输入框不重叠
      // 需要的最小间距
      const minGap = 20 * scale;
      
      // 笔记框左边缘应该在输入框右边缘 + 间距之后
      const notesLeftEdge = inputBoxRightEdge + minGap;
      
      // 可用空间 = 屏幕宽度 - 笔记框左边缘位置
      const availableWidth = screenWidth - notesLeftEdge;
      
      // 笔记框宽度：在200*scale到300*scale之间，但不超过可用空间
      // 在16:9时，优先保证不重叠
      let calculatedWidth;
      if (Math.abs(aspectRatio - ASPECT_RATIO) < 0.1) {
        // 接近16:9时，更保守的计算
        calculatedWidth = Math.max(200 * scale, Math.min(300 * scale, availableWidth - 10 * scale));
      } else {
        // 其他比例时，使用90%的可用空间
        calculatedWidth = Math.max(200 * scale, Math.min(300 * scale, availableWidth * 0.9));
      }
      
      setNotesWidth(calculatedWidth);
    };

    calculateNotesWidth();
    window.addEventListener('resize', calculateNotesWidth);
    return () => window.removeEventListener('resize', calculateNotesWidth);
  }, [scale]);

  // 计算缩放比例和16:9容器样式
  useEffect(() => {
    const calculateScale = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const currentAspectRatio = currentWidth / currentHeight;
      
      // 计算16:9区域的有效高度（不包含黑边）
      const newEffectiveHeight = currentAspectRatio < ASPECT_RATIO 
        ? currentWidth / ASPECT_RATIO  // 宽高比小于16:9，使用计算出的高度
        : currentHeight;  // 宽高比大于等于16:9，使用实际高度
      
      setEffectiveHeight(newEffectiveHeight);
      setIsGameContainerCentered(currentAspectRatio < ASPECT_RATIO);
      
      // 设置游戏容器样式
      if (currentAspectRatio < ASPECT_RATIO) {
        // 宽高比小于16:9，限制高度并居中显示
        setGameContainerStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${currentWidth}px`,
          height: `${effectiveHeight}px`,
          maxWidth: '100vw',
          maxHeight: '100vh',
          overflow: 'hidden',
          zIndex: 1,
        });
      } else {
        // 如果宽高比大于等于16:9，正常全屏显示
        setGameContainerStyle({
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        });
      }
      
      // 计算宽高比缩放，基于16:9区域的有效尺寸（不包含黑边）
      const scaleX = currentWidth / BASE_WIDTH;
      const scaleY = newEffectiveHeight / BASE_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
      // 立绘专用缩放比例：基于初始高度计算，之后固定不变，不随窗口尺寸变化
      // standScale 在组件初始化时已经设置，这里不再更新
      setIsLandscape(currentWidth > currentHeight);
      setIsMobile(isMobileDevice());
    };

    const handleResize = () => {
      calculateScale();
    };

    const handleOrientationChange = () => {
      // 延迟一下，等待方向变化完成
      setTimeout(() => {
        calculateScale();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 初始计算
    calculateScale();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // 切换角色时重置立绘跳跃动画状态，避免切换时触发动画
  useEffect(() => {
    setStandJump(0);
  }, [currActor]);

  // 计算历史背景图片的实际显示位置和尺寸
  const calculateHistoryBgImageLayout = () => {
    if (!historyBgImageRef.current) return;
    
    const img = historyBgImageRef.current;
    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth || 1920; // 假设历史背景图片原始宽度为1920
    const naturalHeight = img.naturalHeight || 1080; // 假设历史背景图片原始高度为1080
    
    // 获取容器的显示尺寸
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // 计算图片的缩放比例（考虑 objectFit: contain 的情况）
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // 计算实际显示的图片尺寸（考虑留白）
    const actualDisplayWidth = naturalWidth / scale;
    const actualDisplayHeight = naturalHeight / scale;
    
    // 计算留白偏移量（图片在容器中居中显示）
    const offsetX = (displayWidth - actualDisplayWidth) / 2;
    const offsetY = (displayHeight - actualDisplayHeight) / 2;
    
    setHistoryBgImageLayout({
      left: rect.left + offsetX,
      top: rect.top + offsetY,
      width: actualDisplayWidth,
      height: actualDisplayHeight,
      naturalWidth,
      naturalHeight,
    });
  };

  // 当打开历史对话或消息更新时，立即定位到底部显示最新内容（无滚动动画）
  useLayoutEffect(() => {
    if (showHistory && historyScrollRef.current) {
      // 使用 useLayoutEffect 在浏览器绘制前同步执行，避免滚动动画
      // 直接设置 scrollTop，不等待任何延迟
      const scrollContainer = historyScrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [showHistory, actors[currActor]?.messages.length, currActor]);

  // 当显示历史对话时，计算背景图片布局
  useEffect(() => {
    if (showHistory) {
      // 延迟一下，等待图片加载完成
      const timer = setTimeout(() => {
        calculateHistoryBgImageLayout();
      }, 100);
      
      // 监听窗口大小变化
      const handleResize = () => {
        calculateHistoryBgImageLayout();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showHistory]);

  useEffect(() => {
    if (!postGame) {
      setFilteredActors(Object.values(actors));
    } else if (!hasEffectRun) {      
      setEndModalOpened(true);
      setHasEffectRun(true);
    }
  }, [actors, postGame]);

  const handleEndGame = () => {
    // 切换背景为12.png
    setBgImage('bg/12.png');
    // 切换到希罗的角色（立绘会自动切换为hiro.png）
    const hiro = Object.values(actors).find(actor => actor.name === '二阶堂希罗');
    if (hiro) {
      setCurrActor(hiro.id);
    }
    setEndGame(true);
  };

  const handleResumeGame = () => {
    setEndGame(false);
  };

  const handleBackToGame = (answers: string[]) => {
    console.log(answers)
    const updatedActors: Record<number, Actor> = { ...actors };
    const larry = Object.values(updatedActors).filter(actor => actor.name === 'Amateur Larry');

    // Clear the chat history for all actors
    Object.keys(updatedActors).forEach(actorId => {
      updatedActors[Number(actorId)].messages = [];
    });
    setActors(updatedActors);

    if (larry.length > 0) {
      const larryId = larry[0].id;

      let forcedMessage = "Detective Sheerluck: Here is my final deduction. ";
      forcedMessage += answers[0] + " killed Victim Vince! ";

      if (answers[0] != "Amateur Larry") {
        forcedMessage += "... Is what I might say if I were not deeply considering all the evidence... I know the truth, you are actually "
      } else {
        forcedMessage += "Or should I say... "
      }
      forcedMessage += "'Agent' Larry, son of the famous Master Thief Jim! "
      
      if (answers[1] != "Getting back stolen treasure") {
        forcedMessage += "And why did you do it? " + answers[1] + "? No, it was not that simple. "
      } else {
        forcedMessage += "You are clearly no amateur. "
      }

      forcedMessage += "Let me outline the evidence. Officer Cleo searched your room and found that you run the 'Expert Detective Blog', a front for black market operations where we found job postings for illegal activities including intimidation and arson. Innocent Ken was also able to confirm this information. We found in your dresser a request form from the Bucket Family mafia requesting Agent Larry to deliver Victim Vince alive to them in exchange for $100K -- we don't have evidence you accepted this request, however, and you clearly failed in keeping him alive. So perhaps there was another reason. There was a treasure map found in your backpack but it was ripped and missing a notable chunk. The missing piece was discovered in Victim Vince's room. Solitary Hannah informed us that you explored the mountains but never actually hunted, that there was a bag mix-up when you and Victim Vince checked in, that Victim Vince at one point was looking at a piece from a treasure map, and how Vince was carrying a blue jewel before was killed. There were old magazines in the lobby mentioning Master Thief Jim as the previous owner of the Andae Mountain Cabin and a famous thief who stole and hid the Crown of the Sun. Manager Patricia reported that you look like Master Thief Jim's relative, and Violent Jerry reported that you talked as if you already had intimate knowledge of the Andae Mountains and the cabin, even though you insisted it was your first time here. The only explanation is that you are the son of Master Thief Jim, and Victim Vince got in the way of you finding the Crown of the Sun treasure. You probably grew up in this very cabin when you were younger, and at some point you realized that the treasure map was likely referencing your childhood home. Your father, Master Thief Jim, used to be the owner of the Mountain Cabin and hid the Crown of the Sun, a stolen jewel worth $20 million, away before he was sentenced to prison. You checked into the cabin on the morning of March 1st, ready to search for the treasure under the guise of being an amateur hunter here for the competition. Upon arrival, your suitcase was accidentally swapped with Victim Vince’s, causing confusion. During this mix-up, a torn piece of the treasure map remained in Vince's room, blocking your search. When confronted, Vince lied about it, frustrating your efforts. Vince realized the map’s significance and was able to find the Crown of the Sun before you, hidden in a tree outside the cabin. Enraged, you broke into Vince’s room in order to steal back the treasure. But Vince was there and refused to cooperate! You ultimately killed Vince with the antler trophy in the room. Due to the heavy flooding outside, you hid his body in a secret compartment in the cabin that you knew about because you used to live here. Thus, you were able to reclaim the Crown of the Sun. Innocent Ken also saw you in possession of the blue gem this morning. Missing Marcel's murder was unrelated. Solitary Hannah and Missing Marcel were best friends and hunting partners. Solitary Hannah accidentally shot Marcel during a hunt, and she concealed the crime by hiding Marcel’s body in the well behind the cabin. This well was hidden under a layer of dirt and had a padlocked door, with the only key kept in Solitary Hannah’s bedroom, Room 103. Hannah has been attending the annual Andae Mountain Hunting Cabin events to keep an eye on the well and ensure her secret remained buried. Due to the murder of Victim Vince, the police discovered Marcel’s body right before the statute of limitations on the murder expired.";
      
      let bio = "Agent Larry is no amateur. Black market contractor and son of the late Master Thief Jim."

      let context = "Amateur Larry's goal is to helpfully and comprehensively inform Detective Sheerluck about the murders and inform about how evidence could have been obtained to make such deducations. Larry is actually named Agent Larry. Larry previously lied to Detective Sheerluck about being a stupid businessman and wannabe hunter. Larry is actually the one who murdered Victim Vince. Larry will now explain all the events (and evidence to support them) surrounding his murder of Victim Vince, Solitary Hannah's murder of Missing Marcel, and all the other mysteries that occurred. Larry accepts that he is going to prison for murdering Vince. Larry will answer all of the detectives outstanding questions, and even inform the detective about where he could have obtained the evidence to deduce the truth. Larry will use the following story context to help provide Detective Sheerluck with answers: This murder mystery takes place in the fictional country of Poirotia, centered around events at the Mountain Cabin in the Andae Mountains. The date is March 4th, year 221. The Andae Mountain Hunting Competition, a 2-night, 3-day event offering a $20K prize, ended yesterday and has been an annual event here for the past 3 years. The competition began with an opening ceremony at noon on March 1st and concluded with the winner announced at 3pm on March 3rd. The winner this year was Victim Vince who received $20,000 in cash that he put in his wallet. This was Victim Vince's third time winining the competition, and Violent Jerry's third time earning second place. Victim Vince went missing on the night of March 3rd and his dead boy was found this morning by the police in a hidden compartment under the rug on the first floor. Within this compartment was the lifeless body of Victim Vince, his back pierced by a broken antler and his torso drenched in blood. Alongside the corpse was a backpack containing an axe, clothes, and an old, torn blue pouch appearing to be a jewelry holder for a necklace (it used to contain the Crown of the Sun before Larry took it). Victim Vince's empty wallet and Manager Patricia's wedding ring were also found on the body. Violent Jerry, the angry, rude, and greedy owner of the Mountain Cabin, harbors an intense hatred for Victim Vince due to his consistent victories in the hunting competition since its inception 3 years prior, relegating Violent Jerry to second place. The Andae Mountain Hunting Competition competition is subsidized by Park Services, and Violent Jerry hopes every year he can pocket the prize winnings but Victim Vince has prevented this every year by placing first place. Violent Jerry resented Victim Vince and decided to try to injure him in a human-sized pit trap to prevent him from winning this year. This pit was intentionally placed directly next to one of Victim Vince's traps and expertly camouflaged such that Victim Vince might fall in and forfeit the competition. Victim Vince, the expert hunter that he is, did not fall for the trap. Violent Jerry recently married 27-year-old Manager Patricia 3 months ago and exhibits controlling behavior by tracking her movements via GPS on his phone. Manager Patricia persuaded Violent Jerry to extend their stay by an extra day to pacify his rage after losing to Victim Vince. Violent Jerry challenged Victim Vince to a private grudge match immediately after the competition ended. Both Violent Jerry and Manager Patricia have blood gashes on their arms, and Manager Patricia is not wearing her wedding ring. Manager Patricia deeply detests her violent husband who constantly tracks her using a GPS. She pretends to love Violent Jerry because Jerry funds Manager Patricia's luxury lifestyle. Manager Patricia secretly promised to pay Victim Vince $150K on the morning of March 3rd to murder Violent Jerry and make the death look like an accident. Manager Patricia did not have $150K on her at the time so gave Victim Vince her wedding ring as collateral until the deed was done. Manager Patricia was also seeing Victim Vince every night in the woods for some 'fun', but she will lie this these were solitary nighttime walks. When Manager Patricia saw that Victim Vince left a note to Violent Jerry to meet outside the cabin on the night of March 3rd, Manager Patricia thought that Victim Vince might reveal Manager Patricia's intentions. She therefore fled the cabin, scared of Violent Jerry's ensuing wrath, but was not able to get far due to the flood that night. Solitary Hannah, an expert hunter known for her intense demeanor and aversion to conversation, only laughs when discussing hunting or violence. Innocent Ken is a 29-year-old employee of the paper-making company No Pulp. He is described as a smelly anime nerd who always carries a body pillow of an anime girl named Sakarin-chan. He claims to have recently gotten engaged to Pwetty Princess, a girl he has been chatting with online, and eagerly anticipates their marriage despite her evasiveness regarding in-person meetings. Innocent Ken enrolled in this competition to finally meet Pwetty Princess in person, but she never showed up, because Violent Jerry was catfishing as her to steal Ken's money. Amateur Larry, actually named Agent Larry, is a 35-year-old who lied that he wished to try hunting for the first time. He appears to be dumb and incompetent, although this is a disguise. The Andae Mountains are shrouded in mystery, with local legends suggesting the area is haunted due to the disappearance of Missing Marcel (a famous fashion designer) 15 years ago. The Andae Woods, the site of the hunting competition, is a wildlife-rich area typically inaccessible outside of the competition due to its status as private property owned by Violent Jerry and Manager Patricia. Within the woods, a well-camouflaged, deep manmade pit can be discovered next to one of Victim Vince's traps, posing a significant hazard that could be deadly if fallen in. Inside the Mountain Cabin, the dimly lit first-floor hallway leads to rooms 101 (Manager Patricia and Violent Jerry), 102 (Amateur Larry), and 103 (Solitary Hannah). The second-floor hallway houses rooms 201 (Victim Vince) and 202 (Innocent Ken). The lobby's competition registry indicates that all suspects extended their stays to 3 nights, with Innocent Ken arriving a day late. This ranking board shows Solitary Hannah  consistently scored 0 points in the competition for the past 3 years. Solitary Hannah oversaw that there was a bag mixup that morning where Victim Vince and Amateur Larry's bags were accidentally swapped during their check-in. Solitary Hannah saw that Amateur Larry constantly explored the mountains but never hunted. Likewise, Solitary Hannah never saw Innocent Ken ever try to actually hunt for wildlife during the competition. Solitary Hannah  was born in the Andae Mountains, the same area where the Mountain Cabin is located. Solitary Hannah is very familiar with an incident that took place 15 years ago where Missing Marcel, a renowned fashion designer and hunting hobbyist, mysteriously vanished in the Andae Woods never to be found again. The real story is that Missing Marcel was Solitary Hannah's best friend and hunting partner. But Solitary Hannah  accidentally shot Missing Marcel and covered up the crime by hiding Missing Marcel's body in the well behind the cabin. The well was hidden by a layer of dirt and has a padlocked door where the only key to it was inside Solitary Hannah's bedroom in room 103. Solitary Hannah attended the annual Andae Mountain Hunting Cabin to keep an eye on the well so that her secret is never discovered. The cabin's key rack is missing the key to Room 201. A notice in the lobby offers a $3k reward for a missing rifle with a distinctive dragon sticker. Old newspapers report on the Andae Mountain's Mystery involving Missing Marcel's disappearance 15 years ago, with the statute of limitations for the potential murder ending in two days (March 7th). Old magazines mention the late Master Thief Jim, known as the next Arsene Lupin and the previous owner of the Andae Mountain Cabin, who stole and hid the famous Crown of the Sun jewel (a blue jewel worth $20 million) before dying in prison. In Room 101, a note from Victim Vince to Violent Jerry can be found, requesting a meeting by the tree behind the cabin at 11PM to discuss something he learned about him. Manager Patricia's backpack contains a checkbook revealing a $200K gift from Violent Jerry, which she is spending heavily. A hat with a bullet hole is found in the room (which Violent Jerry claims results from Victim Vince accidentally firing a gun during the competition). Room 102 contains Amateur Larry's backpack with a rake, a mini shovel, and a hand-drawn map of the mountains resembling a treasure map with ??? written in pink highlighter and the map clearly missing an important ripped piece of it. Amateur Larry's wallet Amateur Larry's wallet holds a detective agency card, and his dresser contains a request form from the Bucket Family mafia requesting 'Agent' Larry to deliver Victim Vince alive to them in exchange for $100K -- this shows that Amateur Larry's real name is Agent Larry. Amateur Larry checked into the Mountain Cabin on March 1st at 7:27 AM to participate in the annual Andae Mountain Hunting Competition. Upon arrival, Amateur Larry's suitcase was accidentally swapped with Victim Vince's, but they soon resolved the mix-up. During the suitcase mix-up, Victim Vince inadvertently took a piece of the treasure map, preventing Amateur Larry from finding the treasure. When confronted, Victim Vince rudely lied about not seeing the map piece in his room. Amateur Larry was not able to find his father's jewel during the competition because of this missing piece of the treasure map. Victim Vince realized the importance of this treasure map and broke into Amateur Larry's bedroom, stole the rest of the treasure map, and found the Crown of the Sun inside a hidden compartment in the tree outside the cabin. After discovering that Amateur Larry stole his treasure map, Larry broke into Victim Vince's bedroom a little before 11pm at night and killed him with an antler trophy in the room. Due to the heavy flooding, Amateur Larry could not immediately escape. Instead, he hid Victim Vince's body in a secret compartment in the cabin hallway that he knew about from his childhood when his father (Master Thief Jim) owned the cabin. Agent Larry now has the Crown of the Sun back from Victim Vince, but the police will be confiscating it. The Master Thief Jim used to own the Andae Mountain property, before it was sold to Violent Jerry, and the Andae Mountain cabin is where Amateur Larry was raised. Amateur Larry accidentally saw Manager Patricia and Victim Vince having an affair in the woods at night, and afterwards Manager Patricia gave Victim Vince her wedding ring! Amateur Larry saw an old newspaper article about how Solitary Hannah and Missing Marcel used to be hunting partners in the Andae Mountains, and how the statute of limitations on Marcel's murder expires at the end of this week. Solitary Hannah's room (Room 103) is in disarray, with a dirt-covered backpack containing an entrenching shovel and an axe. A photo album showcases her extensive professional experience hunting various dangerous animals. Her wallet holds an ID indicating she was born in the Andae Mountains. Hidden under the bed is a diary revealing she recently caught a vermin, mentioning 'only a few days left,' and that she has 'bet everything on this competition.' Also under her bed is a key that can be used to unlock the padlocked well outside the cabin, the well that contains Missing Marcel. Victim Vince's room (Room 201) has bloodstains on the windowsill and beneath the carpet, a pink highlighter on the table, and a single ripped up piece of what looks like a treasure map (which fits perfectly with the map found in Larry's backpack). The competition prize money that Vince won is nowhere to be found (Innocent Ken snuck into Victim Vince's bedroom at 11pm and stole the $20K competition prize winnings from his dresser drawer, that's why he has a big bulge in his pants). A broken antler trophy with half of the antlers missing is found, along with black pens and colored highlighters on the table. A note can be found from Violent Jerry that requests a meeting with Victim Vince by the tree behind the cabin at 11pm to discuss something he learned about him. A phone voice recording reveals woman's voice offering Victim Vince $100K to murder Violent Jerry. Innocent Ken's room (Room 202) has a backpack with anime figurines and a table displaying a No Pulp business card. The drawer contains hunting competition sign-up forms, photos of a woman sent by Pwetty Princess, and bank statements showing tens of thousands spent on gifts for her. Innocent Ken's diary reveals his obsession with Pwetty Princess, mentioning his 29-year wait, his love for her, and excitement over a 'one-shot one-kill gun' present. The diary's handwriting matches the notes in Rooms 101 and 201 between Victim Vince and Violent Jerry. In the months leading up to the competition, Innocent Ken had been in an online relationship with a woman named Pwetty Princess. They recently got engaged online, despite never meeting in person. Pwetty Princess has always avoided meeting Innocent Ken in person, so when she mentioned she would be at the Andae Mountain Hunting Competition, Innocent Ken secretly booked a flight to attend as well so he could finally meet his fiancee. However, upon checking in to the cabin, Innocent Ken realized Pwetty Princess was nowhere to be found. Innocent Ken needed a rifle on short notice to blend in as a potential hunter in the competition, so Ken stole the hunting rifle on the wall of the cabin lobby when nobody was looking. The rifle is hidden in a gun bag in his bedroom (room 202). Innocent Ken saw Violent Jerry digging a deadly human-sized pit near a hunting spot frequently used by Victim Vince -- it's almost like Violent Jerry wanted Victim Vince to fall in. On the 2nd night of the competition (March 2nd), Innocent Ken overhead a drunk Victim Vince confess to Violent Jerry that Vince was pretending to be Innocent Ken's online fiancee Pwetty Princess to scam him out of large sums of money. Upon realizing that Innocent Ken was catfished by Victim Vince, Innocent Ken was heartbroken and plotted to enact revenge on Victim Vince. Innocent Ken forged two notes - one from Violent Jerry to Victim Vince and one from Victim Vince to Violent Jerry - asking them to meet behind the cabin at 11pm that night. Innocent Ken snuck into Victim Vince's bedroom at 11pm and stole the $20K competition prize winnings from his dresser drawer. Pwetty Princess would routinely send you photos online of her rocking body. Innocent Kim saw Amateur Larry holding a blue jewel today in the early morning. His tablet has emails and messages indicating his recent online engagement to Pwetty Princess despite never meeting. A gun bag in Ken's bedroom holds a rifle matching the missing model, with the distinctive dragon sticker. Behind the cabin are a fire pit, a locked well, and a sturdy tree. A dirt pile hides the padlocked cover to the well, which was unlocked by the police this morning using the key found in Solitary Hannah's room. Inside are Missing Marcel's skeleton adorned with his signature designer clothes. The nearby tree has a camouflaged empty rectangular compartment that contained the Crown of the Sun before Vince took it."

      updatedActors[larryId] = {
        ...larry[0],
        name: 'Agent Larry',
        bio: bio,
        personality: "A sad man who worked as a black market operative. Larry does not enjoy killing for pleasure, but Victim Vince was getting in the way of his father's fortune. Vince sadly rot in prison just like his father, and never be able to make use of the fortune from the Crown of the Sun.",
        context1: context,
        secret: '.',
        violation: "Principle 1: Referencing that Agent Larry killed Missing Marcel. Principle 2: Stating that the Crown of the Sun is missing."
      };
      setActors(updatedActors);
      setFilteredActors([updatedActors[larryId]]);
      setCurrActor(larryId);  // Update current actor to Agent Larry

      forceTextResponseToLarry(updatedActors[larryId], forcedMessage);
    }
    setEndGame(false);
    setPostGame(true);
  };

  const forceTextResponseToLarry = (actor: Actor, forcedMessage: string) => {
    const newMessage: LLMMessage = { role: "user", content: forcedMessage };
    sendChat([...actor.messages, newMessage], setActors, globalStory, sessionId, actor, setLoading, undefined, undefined);
  };

  const addNote = () => {
    setNotes([...notes, { id: nextNoteId.current++, content: "" }]);
  };

  const deleteNote = (id: number) => {
    if (notes.length > 1) {
      setNotes(notes.filter(note => note.id !== id));
    }
  };

  const updateNote = (id: number, content: string) => {
    setNotes(notes.map(note => note.id === id ? { ...note, content } : note));
  };

  // 切换背景
  const changeBackground = () => {
    // 将当前背景添加到最近使用的列表中
    const updatedRecent = [bgImage, ...recentBgImages].slice(0, 7); // 保持最多7个
    
    // 获取可用的背景图片（排除最近7次使用的）
    const availableBgs = BG_IMAGES.filter(bg => !updatedRecent.includes(bg));
    
    // 如果所有背景都在最近7次中，则从所有背景中选择（这种情况不太可能，因为有48张图）
    const candidateBgs = availableBgs.length > 0 ? availableBgs : BG_IMAGES;
    
    // 随机选择一个新背景
    let newBg = candidateBgs[Math.floor(Math.random() * candidateBgs.length)];
    
    // 确保切换到不同的背景（双重保险）
    let attempts = 0;
    while (newBg === bgImage && attempts < 10) {
      newBg = candidateBgs[Math.floor(Math.random() * candidateBgs.length)];
      attempts++;
    }
    
    setBgImage(newBg);
    setRecentBgImages(updatedRecent);
  };

  // 切换地图显示
  const toggleMap = () => {
    setShowMap(!showMap);
    if (!showMap) {
      setCurrentMapIndex(1); // 默认显示 map_1.png
    }
  };

  // 切换证物显示
  const toggleEvidence = () => {
    const newShowEvidence = !showEvidence;
    setShowEvidence(newShowEvidence);
    // 打开证物界面时，默认选中第一个已获取的证物
    if (newShowEvidence) {
      const obtainedEvidences = evidenceList
        .filter(e => e.obtained)
        .sort((a, b) => a.id.localeCompare(b.id));
      if (obtainedEvidences.length > 0) {
        setSelectedEvidence(obtainedEvidences[0]);
      } else {
        setSelectedEvidence(null);
      }
    }
  };

  // 处理历史对话背景图片点击（关闭历史对话）
  const handleHistoryBgClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();
    const imgElement = img as HTMLImageElement;
    
    // 获取图片的原始尺寸
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    // 如果图片还没有加载完成，直接返回
    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }
    
    // 获取容器的显示尺寸
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // 计算图片的缩放比例（考虑 objectFit: contain 的情况）
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // 计算实际显示的图片尺寸（考虑留白）
    const actualDisplayWidth = naturalWidth / scale;
    const actualDisplayHeight = naturalHeight / scale;
    
    // 计算留白偏移量（图片在容器中居中显示）
    const offsetX = (displayWidth - actualDisplayWidth) / 2;
    const offsetY = (displayHeight - actualDisplayHeight) / 2;
    
    // 计算点击位置相对于容器的坐标
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // 检查点击是否在图片实际显示区域内
    if (clickX < offsetX || clickX > offsetX + actualDisplayWidth ||
        clickY < offsetY || clickY > offsetY + actualDisplayHeight) {
      return; // 点击在留白区域，不处理
    }
    
    // 计算点击位置相对于实际显示图片的坐标（减去留白）
    const imageRelativeX = clickX - offsetX;
    const imageRelativeY = clickY - offsetY;
    
    // 转换为图片原始坐标
    const imageX = Math.round(imageRelativeX * scale);
    const imageY = Math.round(imageRelativeY * scale);
    
    // 关闭区域：X1: 1752, Y1: 1, X2: 1917, Y2: 142
    if (imageX >= 1752 && imageX <= 1917 && imageY >= 1 && imageY <= 142) {
      setShowHistory(false);
    }
  };

  // 处理地图区域点击
  const handleMapClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();
    const imgElement = img as HTMLImageElement;
    
    // 获取图片的原始尺寸
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    // 如果图片还没有加载完成，直接返回
    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }
    
    // 获取容器的显示尺寸
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // 计算图片的缩放比例（考虑 objectFit: contain 的情况）
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;
    const scale = Math.min(scaleX, scaleY); // objectFit: contain 使用较小的缩放比例
    
    // 计算实际显示的图片尺寸（考虑留白）
    const actualDisplayWidth = naturalWidth / scale;
    const actualDisplayHeight = naturalHeight / scale;
    
    // 计算留白偏移量（图片在容器中居中显示）
    const offsetX = (displayWidth - actualDisplayWidth) / 2;
    const offsetY = (displayHeight - actualDisplayHeight) / 2;
    
    // 计算点击位置相对于容器的坐标
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // 检查点击是否在图片实际显示区域内
    if (clickX < offsetX || clickX > offsetX + actualDisplayWidth ||
        clickY < offsetY || clickY > offsetY + actualDisplayHeight) {
      return; // 点击在留白区域，不处理
    }
    
    // 计算点击位置相对于实际显示图片的坐标（减去留白）
    const imageRelativeX = clickX - offsetX;
    const imageRelativeY = clickY - offsetY;
    
    // 转换为图片原始坐标
    const imageX = Math.round(imageRelativeX * scale);
    const imageY = Math.round(imageRelativeY * scale);
    
    // 将地图索引转换为地图类型：0=map_2('2'), 1=map_1('1'), 2=map_b1('b1')
    const mapType = currentMapIndex === 0 ? '2' : currentMapIndex === 1 ? '1' : 'b1';
    
    // 查找点击的区域
    const region = findRegionByClick(mapType, imageX, imageY);
    
    if (region) {
      // 如果是关闭区域，只关闭地图
      if (region.closeMap) {
        setShowMap(false);
        return; // 只关闭地图，不执行其他操作
      }
      
      // 如果是楼层切换区域，切换地图而不关闭
      if (region.switchMap) {
        // 将地图类型转换为索引：'1'=1, '2'=0, 'b1'=2
        const newMapIndex = region.switchMap === '1' ? 1 : region.switchMap === '2' ? 0 : 2;
        setCurrentMapIndex(newMapIndex);
        return; // 只切换地图，不执行其他操作
      }
      
      // 检查是否需要获取证物
      if (region.obtainEvidenceId) {
        const evidenceId = region.obtainEvidenceId; // 提取到常量，确保类型安全
        setEvidenceList((prevList) => {
          const evidence = prevList.find(e => e.id === evidenceId);
          // 只有当证物未获取时才执行获取操作（obtainEvidence 函数内部也会检查，但这里可以提前判断避免不必要的更新）
          if (evidence && !evidence.obtained) {
            const updatedList = obtainEvidence(evidenceId, prevList);
            console.log(`获取证物：${evidence.image}`);
            // 记录新获得的证物图片
            setNewEvidenceImage(evidence.image);
            // 显示证物更新通知
            setShowEvidenceUpdate(true);
            // 如果同时有证言更新，清除证言更新（优先显示证物更新）
            if (showContextUpdate) {
              setShowContextUpdate(false);
            }
            // 动画结束后（2秒）清除图片状态，但保持通知显示到3秒
            setTimeout(() => {
              setNewEvidenceImage(null);
            }, 2000);
            setTimeout(() => {
              setShowEvidenceUpdate(false);
            }, 3000);
            return updatedList;
          }
          return prevList; // 如果已经获取，不更新列表
        });
      }
      
      // 普通区域：关闭地图
      setShowMap(false);
      
      // 切换背景图片（如果指定了）
      if (region.bgImage) {
        setBgImage(region.bgImage);
      }
      
      // 找到希罗的角色
      const hiro = Object.values(actors).find(actor => actor.name === '二阶堂希罗');
      if (hiro) {
        // 清除希罗的"继续对话"状态，确保显示回复框
        clearContinueDialogState(hiro.id);
        
        // 切换到希罗的会话
        setCurrActor(hiro.id);
        
        // 添加回复消息到希罗的会话
        const newMessage: LLMMessage = {
          role: 'assistant',
          content: region.message,
        };
        
        setActors((all) => {
          const newActors = { ...all };
          newActors[hiro.id] = {
            ...newActors[hiro.id],
            messages: [...newActors[hiro.id].messages, newMessage],
          };
          return newActors;
        });
        
        // 减少倒计时（调查地图）
        setActionCountdown(prev => Math.max(0, prev - 1));
      }
    }
  };

  // 切换地图（向左）
  const switchMapLeft = () => {
    setCurrentMapIndex((prev) => (prev - 1 + MAP_IMAGES.length) % MAP_IMAGES.length);
  };

  // 切换地图（向右）
  const switchMapRight = () => {
    setCurrentMapIndex((prev) => (prev + 1) % MAP_IMAGES.length);
  };

  // 当切换角色时，清除强制立绘变体，让立绘根据新角色的 context1 来决定
  useEffect(() => {
    setCurrentStandVariant(null);
  }, [currActor]);

  // 获取当前角色的立绘 - 使用 useMemo 确保位置配置在切换时立即正确计算
  // 根据context状态决定使用哪个立绘变体，如果提供了强制变体（由出示证物触发），则使用强制变体
  const currentStandImagePath = useMemo(() => {
    return actors[currActor] ? getStandImage(actors[currActor].image, actors[currActor], currentStandVariant) : null;
  }, [actors, currActor, currentStandVariant]);

  const currentStandImageSrc = useMemo(() => {
    return currentStandImagePath ? getStandImageSrc(currentStandImagePath) : null;
  }, [currentStandImagePath]);

  const currentStandPosition = useMemo(() => {
    return actors[currActor] ? getStandPosition(actors[currActor].image) : null;
  }, [actors, currActor]);

  // 使用 useMemo 缓存背景图片路径，避免重复计算
  const currentBgImageSrc = useMemo(() => {
    return getBgImageSrc(bgImage);
  }, [bgImage]);

  return (
    <>
      {/* 黑色背景层 - 当宽高比小于16:9时显示上下黑边 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          zIndex: 0,
        }}
      />
      
      {/* 游戏内容容器 - 限制为16:9宽高比 */}
      <div style={gameContainerStyle}>
      {/* 横屏提示遮罩层 - 移动设备竖屏时显示 */}
      {isMobile && !isLandscape && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10000, // 最高层级，覆盖所有内容
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '30px' }}>📱</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
            请将设备横屏使用
          </div>
          <div style={{ fontSize: '20px', opacity: 0.8 }}>
            为了获得最佳游戏体验，请将您的设备旋转至横屏模式
          </div>
        </div>
      )}

      {/* 地图显示区域 - 全屏显示，置于最上层，放在 AppShell 外部以确保覆盖所有内容 */}
      {showMap && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999, // 设置为最高层级，确保覆盖所有其他组件
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 地图图片 - 全屏显示 */}
          <Image
            src={getMapImageSrc(MAP_IMAGES[currentMapIndex])}
            alt={`Map ${currentMapIndex + 1}`}
            onClick={handleMapClick}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
          />
        </div>
      )}

      {/* 证物显示区域 - 全屏显示，置于最上层，放在 AppShell 外部以确保覆盖所有内容 */}
      {showEvidence && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999, // 设置为最高层级，确保覆盖所有其他组件
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EvidenceDisplay
            evidenceList={evidenceList}
            selectedEvidence={selectedEvidence}
            onSelectEvidence={setSelectedEvidence}
            onClose={() => setShowEvidence(false)}
            backgroundImageSrc={getEvidenceImageSrc()}
            currentActorId={currActor}
            actors={actors}
            setActors={setActors}
            setEvidenceList={setEvidenceList}
            scale={scale}
            onAction={() => setActionCountdown(prev => Math.max(0, prev - 1))}
            onContextAdded={() => {
              // 显示证言更新通知
              setShowContextUpdate(true);
              setTimeout(() => setShowContextUpdate(false), 3000);
            }}
            onEvidenceObtained={(evidenceId) => {
              // 找到新获得的证物
              const newEvidence = evidenceList.find(e => e.id === evidenceId && !e.obtained);
              if (newEvidence) {
                setNewEvidenceImage(newEvidence.image);
                setShowEvidenceUpdate(true);
                // 如果同时有证言更新，清除证言更新（优先显示证物更新）
                if (showContextUpdate) {
                  setShowContextUpdate(false);
                }
                // 动画结束后（2秒）清除图片状态，但保持通知显示到3秒
                setTimeout(() => {
                  setNewEvidenceImage(null);
                }, 2000);
                setTimeout(() => {
                  setShowEvidenceUpdate(false);
                }, 3000);
              }
            }}
            onStandVariantChange={(variant) => {
              // 切换立绘变体
              setCurrentStandVariant(variant);
            }}
          />
        </div>
      )}

      <AppShell
        navbar={{
          width: 200 * scale, // 根据缩放比例调整侧边栏宽度
          breakpoint: 0, // 禁用响应式行为，始终保持侧边栏固定宽度
        }}
        padding={0}
        styles={{
          navbar: {
            backgroundColor: 'transparent',
            border: 'none',
            width: `${200 * scale}px !important`, // 强制固定宽度
            minWidth: `${200 * scale}px !important`, // 确保最小宽度
            maxWidth: `${200 * scale}px !important`, // 确保最大宽度
          },
          main: {
            backgroundColor: 'transparent',
          },
          root: {
            border: 'none',
          },
        }}
      >
      <AppShell.Navbar style={{ backgroundColor: 'transparent' }}>
        <ActorSidebar 
          currentActor={currActor} 
          setCurrentActor={setCurrActor} 
          actors={filteredActors} 
          postGame={postGame}
          scale={scale}
        />
      </AppShell.Navbar>
      <AppShell.Main>
        {/* 立绘跳跃动画样式 */}
        <style>{`
          @keyframes standJump {
            0%, 100% {
              transform: ${currentStandPosition?.transform || 'translateX(-50%)'} translateY(0px);
            }
            25% {
              transform: ${currentStandPosition?.transform || 'translateX(-50%)'} translateY(-${20 * standScale}px);
            }
            50% {
              transform: ${currentStandPosition?.transform || 'translateX(-50%)'} translateY(0px);
            }
            75% {
              transform: ${currentStandPosition?.transform || 'translateX(-50%)'} translateY(-${20 * standScale}px);
            }
          }
        `}</style>
        {/* 背景图层 - 最底层 */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            backgroundImage: `url(${currentBgImageSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* 人物立绘 - 在背景上方、其他内容下方，zIndex: 1 */}
        {currentStandImageSrc && currentStandPosition && (
          <div
            key={`stand-${currActor}-${actors[currActor]?.image}`} // 使用 key 确保切换时立即更新
            style={{
              position: 'fixed',
              bottom: currentStandPosition.bottom 
                ? (typeof currentStandPosition.bottom === 'number' 
                    ? `${currentStandPosition.bottom * standScale}px`
                    : `${parseFloat(String(currentStandPosition.bottom)) * standScale}px`)
                : `${20 * standScale}px`,
              left: currentStandPosition.left 
                ? (typeof currentStandPosition.left === 'number'
                    ? `${currentStandPosition.left * standScale}px`
                    : currentStandPosition.left.includes('%') || currentStandPosition.left.includes('vw') || currentStandPosition.left.includes('vh') || currentStandPosition.left.includes('calc')
                      ? currentStandPosition.left
                      : `${parseFloat(String(currentStandPosition.left)) * standScale}px`)
                : undefined,
              right: currentStandPosition.right
                ? (typeof currentStandPosition.right === 'number'
                    ? `${currentStandPosition.right * standScale}px`
                    : currentStandPosition.right.includes('%') || currentStandPosition.right.includes('vw') || currentStandPosition.right.includes('vh') || currentStandPosition.right.includes('calc')
                      ? currentStandPosition.right
                      : `${parseFloat(String(currentStandPosition.right)) * standScale}px`)
                : undefined,
              transform: currentStandPosition.transform || 'translateX(-50%)',
              zIndex: 1,
              maxHeight: currentStandPosition.maxHeight 
                ? (typeof currentStandPosition.maxHeight === 'number'
                    ? `${currentStandPosition.maxHeight * standScale}px`
                    : currentStandPosition.maxHeight.includes('vh')
                      ? `${(parseFloat(String(currentStandPosition.maxHeight)) * BASE_HEIGHT / 100) * standScale}px`
                      : currentStandPosition.maxHeight.includes('vw')
                        ? `${(parseFloat(String(currentStandPosition.maxHeight)) * BASE_WIDTH / 100) * standScale}px`
                        : currentStandPosition.maxHeight.includes('%')
                          ? currentStandPosition.maxHeight
                          : `${parseFloat(String(currentStandPosition.maxHeight)) * standScale}px`)
                : `${(40 * BASE_HEIGHT / 100) * standScale}px`,
              maxWidth: currentStandPosition.maxWidth
                ? (typeof currentStandPosition.maxWidth === 'number'
                    ? `${currentStandPosition.maxWidth * standScale}px`
                    : currentStandPosition.maxWidth.includes('vw')
                      ? `${(parseFloat(String(currentStandPosition.maxWidth)) * BASE_WIDTH / 100) * standScale}px`
                      : currentStandPosition.maxWidth.includes('vh')
                        ? `${(parseFloat(String(currentStandPosition.maxWidth)) * BASE_HEIGHT / 100) * standScale}px`
                        : currentStandPosition.maxWidth.includes('%')
                          ? currentStandPosition.maxWidth
                          : `${parseFloat(String(currentStandPosition.maxWidth)) * standScale}px`)
                : `${(30 * BASE_WIDTH / 100) * standScale}px`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              transition: 'bottom 0.3s ease, left 0.3s ease, right 0.3s ease, transform 0.3s ease, maxHeight 0.3s ease, maxWidth 0.3s ease', // 添加平滑过渡
              animation: standJump > 0 ? 'standJump 0.6s ease-in-out' : 'none',
            }}
          >
            <Image
              src={currentStandImageSrc}
              alt={actors[currActor]?.name || 'Character'}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* 倒计时显示 - 中间左上方（挨着左侧边栏） */}
        {!endGame && (
          <div
            style={{
              position: 'fixed',
              top: `${10 * scale}px`,
              left: `${200 * scale}px`, // 左侧边栏宽度 + 间距
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: `${8 * scale}px ${12 * scale}px`,
              borderRadius: `${4 * scale}px`,
              color: 'white',
              fontSize: `${16 * scale}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: '1.4',
            }}
          >
            <div>距审判开始还剩</div>
            <div>
              <span style={{ color: '#A90000', fontSize: `${22 * scale}px`, fontWeight: 'bold' }}>{actionCountdown}</span> 次行动
            </div>
          </div>
        )}

        {/* 证物/证言更新通知 - 倒计时下方 */}
        {!endGame && (showEvidenceUpdate || showContextUpdate) && (
          <>
            {/* 动画样式 */}
            <style>{`
              @keyframes evidenceImageAnimation {
                0% {
                  transform: translate(-200%, calc(-50% + 200px));
                  opacity: 0;
                }
                25% {
                  transform: translate(-200%, -50%);
                  opacity: 1;
                }
                75% {
                  transform: translate(-200%, -50%);
                  opacity: 1;
                }
                100% {
                  transform: translate(-200%, calc(-50% + 200px));
                  opacity: 0;
                }
              }
              @keyframes notificationFadeOut {
                0% {
                  opacity: 1;
                }
                83.33% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                }
              }
              .evidence-image-animated {
                animation: evidenceImageAnimation 2s ease-in-out forwards;
              }
              .notification-fade-out {
                animation: notificationFadeOut 3s ease-in-out forwards;
              }
            `}</style>
            <div
              style={{
                position: 'fixed',
                // 倒计时：top=10*scale, 高度≈32*scale, 间距10*scale
                top: `${110 * scale}px`,
                left: `${200 * scale}px`, // 左侧边栏宽度 + 间距
                zIndex: 9998, // 设置为最高层级（仅次于模态框），确保在最上层
                display: 'flex',
                flexDirection: 'column',
                gap: `${showEvidenceUpdate && showContextUpdate ? 0 : 8 * scale}px`, // 同时显示时无间距（使用marginBottom控制）
              }}
            >
            {showEvidenceUpdate && (
              <div
                style={{
                  position: 'relative',
                  width: `${790 * scale}px`, // 放大至原来的三倍
                  height: `${390 * scale}px`, // 放大至原来的三倍
                  marginBottom: showContextUpdate ? `${10 * scale}px` : '0', // 如果同时显示证言更新，添加下边距
                }}
              >
                {/* bg1.png 背景图片 - 最底层 */}
                {newEvidenceImage && getBg1ImageSrc() && (
                  <Image
                    src={getBg1ImageSrc()}
                    alt=""
                    className="evidence-image-animated"
                    style={{
                      position: 'absolute',
                      top: '20%',
                      left: '71.5%',
                      width: `${220 * scale}px`,
                      height: `${220 * scale}px`,
                      objectFit: 'contain',
                      zIndex: 1, // 最底层
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* 新获得的证物图片 - 中间层 */}
                {newEvidenceImage && getEvidenceItemImageSrc(newEvidenceImage) && (
                  <Image
                    src={getEvidenceItemImageSrc(newEvidenceImage)}
                    alt=""
                    className="evidence-image-animated"
                    style={{
                      position: 'absolute',
                      top: '20.5%',
                      left: '61%',
                      width: `${166 * scale}px`,
                      height: `${166 * scale}px`,
                      objectFit: 'contain',
                      zIndex: 2, // 中间层，在bg1.png之上
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* get.png 背景图片 - 最上层 */}
                <Image
                  src={getNotificationBgSrc()}
                  alt=""
                  className="notification-fade-out"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 3, // 最上层，覆盖所有图片
                  }}
                />
                {/* 文字 - 最上层，半透明 */}
                <div
                  className="notification-fade-out"
                  style={{
                    position: 'absolute',
                    top: '50.3%',
                    left: '49.5%',
                    transform: 'translate(-290%, -575%)', // 向左上方移动
                    color: 'rgba(255, 255, 255, 0.8)', // 80%透明度
                    fontSize: `${21 * scale}px`, // 文字也放大三倍
                    fontFamily: '"方正公文小标宋", "FangZheng GongWen XiaoBiaoSong", serif',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 4, // 文字在最上层
                  }}
                >
                  证物更新...
                </div>              </div>
            )}
            {showContextUpdate && (
              <div
                style={{
                  position: 'relative',
                  width: `${790 * scale}px`, // 放大至原来的三倍
                  height: `${400 * scale}px`, // 放大至原来的三倍
                }}
              >
                <Image
                  src={getNotificationBgSrc()}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50.3%',
                    left: '49.5%',
                    transform: 'translate(-290%, -575%)', // 向左上方移动
                    color: 'rgba(255, 255, 255, 0.8)', // 60%透明度
                    fontSize: `${21 * scale}px`, // 文字也放大三倍
                    fontFamily: '"方正公文小标宋", "FangZheng GongWen XiaoBiaoSong", serif',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  证言更新...
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {/* 顶部按钮 - 正中间位置，垂直中心与倒计时对齐 */}
        {!endGame && (
          <div
            style={{
              position: 'fixed',
              // 倒计时：top=10*scale, padding=6*scale*2=12*scale, 数字fontSize=20*scale，总高度≈32*scale，垂直中心=10+16=26*scale
              // 按钮：minHeight=32*scale, padding=6*scale*2=12*scale，实际高度可能更高，假设为36*scale，中心=top+18*scale
              // 对齐：按钮top + 18*scale = 26*scale，所以按钮top = 8*scale
              top: `${14 * scale}px`, // 稍微靠下，使垂直中心对齐
              left: '50%', // 水平居中
              transform: 'translateX(-50%)', // 水平居中
              zIndex: 1000,
              display: 'flex',
              gap: `${10 * scale}px`,
              alignItems: 'center', // 确保按钮垂直居中
            }}
          >
            <Button
              onClick={() => setHelpModalOpened(true)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: `${14 * scale}px`,
                padding: `${6 * scale}px ${12 * scale}px`,
                height: 'auto',
                minHeight: `${32 * scale}px`,
              }}
            >
              说明
            </Button>
            <Button
              onClick={toggleMap}
              style={{
                backgroundColor: showMap ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: `${14 * scale}px`,
                padding: `${6 * scale}px ${12 * scale}px`,
                height: 'auto',
                minHeight: `${32 * scale}px`,
              }}
            >
              调查
            </Button>
            <Button
              onClick={toggleEvidence}
              style={{
                backgroundColor: showEvidence ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: `${14 * scale}px`,
                padding: `${6 * scale}px ${12 * scale}px`,
                height: 'auto',
                minHeight: `${32 * scale}px`,
              }}
            >
              出示
            </Button>
            <Button
              onClick={() => setShowHistory(true)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: `${14 * scale}px`,
                padding: `${6 * scale}px ${12 * scale}px`,
                height: 'auto',
                minHeight: `${32 * scale}px`,
              }}
            >
              历史对话
            </Button>
            <Button
              onClick={changeBackground}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: `${14 * scale}px`,
                padding: `${6 * scale}px ${12 * scale}px`,
                height: 'auto',
                minHeight: `${32 * scale}px`,
              }}
            >
              切换背景
            </Button>
            {!postGame && (
              <Button
                onClick={handleEndGame}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  fontSize: `${14 * scale}px`,
                  padding: `${6 * scale}px ${12 * scale}px`,
                  height: 'auto',
                  minHeight: `${32 * scale}px`,
                }}
              >
                结束游戏
              </Button>
            )}
          </div>
        )}


        {endGame ? (
          <MultipleChoiceGame 
            onBackToGame={handleBackToGame} 
            onResumeGame={handleResumeGame} 
            scale={scale}
            showBackButton={!countdownEnded}
          />
        ) : (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* 左侧对话区域 - 现在只显示输入框和回复框，由Actor组件管理 */}
              <div style={{ flex: 1, height: 'calc(100vh - 30px)', display: 'flex', flexDirection: 'column' }}>
                <ActorChat 
                  actor={actors[currActor]} 
                  scale={scale}
                  standScale={standScale}
                  effectiveHeight={effectiveHeight}
                  isGameContainerCentered={isGameContainerCentered}
                  onMessageSent={() => {
                    // 触发立绘跳跃动画（两次跳跃）
                    setStandJump(prev => prev + 1);
                    setTimeout(() => {
                      setStandJump(prev => prev + 1);
                    }, 300);
                    // 减少倒计时（一次对话减少2次行动）
                    setActionCountdown(prev => Math.max(0, prev - 1));
                  }}
                  onEvidenceObtained={(evidenceId) => {
                    // 当通过关键词检测获取证物时，更新证物列表
                    setEvidenceList((prevList) => {
                      const newEvidence = prevList.find(e => e.id === evidenceId && !e.obtained);
                      const updatedList = prevList.map(evidence => {
                        if (evidence.id === evidenceId && !evidence.obtained) {
                          return { ...evidence, obtained: true };
                        }
                        return evidence;
                      });
                      // 如果有新证物，显示通知
                      if (newEvidence) {
                setNewEvidenceImage(newEvidence.image);
                setShowEvidenceUpdate(true);
                // 如果同时有证言更新，清除证言更新（优先显示证物更新）
                if (showContextUpdate) {
                  setShowContextUpdate(false);
                }
                // 动画结束后（2秒）清除图片状态，但保持通知显示到3秒
                setTimeout(() => {
                  setNewEvidenceImage(null);
                }, 2000);
                setTimeout(() => {
                  setShowEvidenceUpdate(false);
                }, 3000);
                      }
                      return updatedList;
                    });
                  }}
                />
              </div>
              {/* 右侧Notes区域 */}
              <div style={{ 
                height: 'calc(100vh - 20px)', 
                display: 'flex', 
                flexDirection: 'column', 
                paddingRight: `${5 * scale}px`, 
                width: `${notesWidth}px`,
                flexShrink: 0 
              }}>
                <div style={{ marginTop: `${10 * scale}px` }}></div>
                <div 
                  style={{ 
                    overflowY: 'auto', 
                    overflowX: 'hidden', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: `${10 * scale}px`, 
                    paddingBottom: `${10 * scale}px`,
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE and Edge
                  }}
                  className="notes-scroll-container"
                >
                  <style>{`
                    .notes-scroll-container::-webkit-scrollbar {
                      display: none; /* Chrome, Safari, Opera */
                    }
                  `}</style>
                  {notes.map((note, index) => (
                    <div key={note.id} style={{ position: 'relative', flexShrink: 0 }}>
                      {index > 0 && (
                        <ActionIcon
                          style={{
                            position: 'absolute',
                            top: `${8 * scale}px`,
                            right: `${8 * scale}px`,
                            zIndex: 10,
                            color: 'white',
                            cursor: 'pointer',
                            width: `${24 * scale}px`,
                            height: `${24 * scale}px`,
                          }}
                          onClick={() => deleteNote(note.id)}
                          variant="subtle"
                          size="sm"
                        >
                          <span style={{ fontSize: `${18 * scale}px` }}>×</span>
                        </ActionIcon>
                      )}
                      <div>
                        <style>{`
                          .note-textarea::placeholder {
                            color: rgba(255, 255, 255, 0.6) !important;
                          }
                        `}</style>
                        <Textarea
                          autosize
                          minRows={6}
                          maxRows={30}
                          value={note.content}
                          onChange={(event) => updateNote(note.id, event.currentTarget.value)}
                          className="note-textarea"
                          placeholder="输入笔记..."
                          styles={{
                            input: {
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              border: 'none',
                              fontSize: `${14 * scale}px`,
                            },
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={addNote}
                    variant="subtle"
                    style={{
                      width: '100%',
                      flexShrink: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      fontSize: `${14 * scale}px`,
                      padding: `${8 * scale}px ${16 * scale}px`,
                      height: 'auto',
                      minHeight: 'auto',
                    }}
                  >
                    + 添加笔记
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 历史对话场景 */}
        {showHistory && (
          <>
            <style>{`
              .history-scroll-container::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
              }
              .history-scroll-container {
                -ms-overflow-style: none; /* IE and Edge */
                scrollbar-width: none; /* Firefox */
              }
            `}</style>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 2000,
                backgroundColor: 'rgba(0, 0, 0, 0.8)', // 与地图和证物相同的半透明背景
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
            {/* 历史背景图片 - 与地图和证物相同的显示方式 */}
            {getHistoryBgSrc() && (
              <Image
                ref={historyBgImageRef}
                src={getHistoryBgSrc()}
                alt="History Background"
                onClick={handleHistoryBgClick}
                onLoad={calculateHistoryBgImageLayout}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain', // 与地图和证物相同的缩放方式
                  cursor: 'pointer', // 添加指针样式
                }}
              />
            )}

            {/* 历史对话内容 */}
            {historyBgImageLayout && (
            <div
              ref={historyScrollRef}
              className="history-scroll-container"
              style={{
                position: 'absolute',
                top: `${historyBgImageLayout.top}px`,
                left: `${historyBgImageLayout.left}px`,
                width: `${historyBgImageLayout.width}px`,
                height: `${historyBgImageLayout.height}px`,
                zIndex: 1,
                padding: `${40 * scale}px 0`,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollBehavior: 'auto', // 禁用平滑滚动，确保立即定位
                pointerEvents: 'none', // 不拦截点击事件，让背景图片可以接收点击
              }}
            >
              <div
                style={{
                  maxWidth: '1200px',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  pointerEvents: 'auto', // 文字内容可以正常交互和滚动
                  width: '100%',
                }}
              >
                {actors[currActor]?.messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  const nameImageSrc = isUser 
                    ? getPlayerNameImageSrc()
                    : getCharacterNameImageSrc(actors[currActor]?.image || '');
                  
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        padding: `${20 * scale}px`,
                        paddingTop: nameImageSrc ? `${90 * scale}px` : `${20 * scale}px`,
                        color: 'white',
                        minHeight: `${60 * scale}px`,
                      }}
                    >
                      {/* 名称图片 - 左上方，相对于背景图片的位置 */}
                      {nameImageSrc && historyBgImageLayout && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0px',
                            left: `${(190 / BASE_WIDTH) * historyBgImageLayout.width}px`, // 使用基准尺寸计算，保持与基准屏幕一致
                            zIndex: 10,
                          }}
                        >
                          <Image
                            src={nameImageSrc}
                            alt={isUser ? '玩家' : actors[currActor]?.name}
                            style={{
                              maxHeight: `${100 * scale}px`,
                              maxWidth: `${250 * scale}px`,
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}
                      {/* 对话内容 - 相对于背景图片的位置 */}
                      {historyBgImageLayout && (
                      <div
                        style={{
                          fontSize: `${18 * scale}px`,
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          marginLeft: `${(240 / BASE_WIDTH) * historyBgImageLayout.width}px`, // 使用基准尺寸计算，保持与基准屏幕一致
                          marginRight: `${(210 / BASE_WIDTH) * historyBgImageLayout.width}px`, // 使用基准尺寸计算，保持与基准屏幕一致
                        }}
                      >
                        {isUser && message.content.startsWith('二阶堂希罗: ') 
                          ? message.content.replace(/^二阶堂希罗: /, '') 
                          : message.content}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
          </>
        )}
      </AppShell.Main>

      <IntroModal
        opened={introModalOpened}
        onClose={() => setIntroModalOpened(false)}
      />

      <HelpModal
        opened={helpModalOpened}
        onClose={() => setHelpModalOpened(false)}
      />

      <EndModal
        opened={endModalOpened}
        onClose={() => setEndModalOpened(false)}
      />


    </AppShell>
      </div>
    </>
  );
}


