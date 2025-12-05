// 人物立绘位置配置文件
// 每个角色可以单独配置位置、大小等参数

export interface StandPosition {
  bottom?: number | string;      // 距离底部的距离（px或百分比）
  left?: number | string;        // 距离左侧的距离（px或百分比）
  right?: number | string;       // 距离右侧的距离（px或百分比）
  maxHeight?: number | string;   // 最大高度
  maxWidth?: number | string;   // 最大宽度
  transform?: string;            // CSS transform属性
}

// 根据头像文件名（去掉扩展名）获取立绘位置配置
// 如果某个角色没有配置，将使用默认值
export const getStandPosition = (avatarFileName: string): StandPosition => {
  const baseName = avatarFileName.replace(/\.(jpg|jpeg|png)$/i, '');
  
  // 默认位置配置
  const defaultPosition: StandPosition = {
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxHeight: '50vh',
    maxWidth: '38vw',
  };

  // 各个角色的位置配置（基于头像文件名）
  const positionMap: Record<string, StandPosition> = {
    'ema': {
      bottom: '-480px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '55vh',
      maxWidth: '38.5vw',
    },
    'hiro': {
      bottom: '-490px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '57vw',
    },
    'anan': {
      bottom: '-410px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '59vw',
    },
    'noa': {
      bottom: '-395px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '57vw',
    },
    'leia': {
      bottom: '-660px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '51vw',
    },
    'milia': {
      bottom: '-555px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '44vw',
    },
    'mage': {
      bottom: '-320px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '31vw',
    },
    'nanoka': {
      bottom: '-495px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '45vw',
    },
    'arisa': {
      bottom: '-450px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '50vw',
    },
    'sherry': {
      bottom: '-465px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '54vw',
    },
    'hanna': {
      bottom: '-360px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '57vw',
    },
    'koko': {
      bottom: '-500px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '45vw',
    },
    'meruru': {
      bottom: '-430px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: '50vh',
      maxWidth: '56.5vw',
    },
  };

  // 返回该角色的配置，如果没有则返回默认配置
  return positionMap[baseName] || defaultPosition;
};

