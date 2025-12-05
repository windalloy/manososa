// 角色名称图片位置配置文件
// 每个角色可以单独配置名称图片的位置、大小等参数

export interface NamePosition {
  top?: number | string;        // 距离顶部的距离（px或百分比）
  left?: number | string;        // 距离左侧的距离（px或百分比）
  right?: number | string;       // 距离右侧的距离（px或百分比）
  maxHeight?: number | string;   // 最大高度
  maxWidth?: number | string;    // 最大宽度
  transform?: string;            // CSS transform属性
}

// 根据头像文件名（去掉扩展名）获取名称图片位置配置
// 如果某个角色没有配置，将使用默认值
export const getNamePosition = (avatarFileName: string): NamePosition => {
  let baseName = avatarFileName.replace(/\.(jpg|jpeg|png)$/i, '');
  
  // 处理特殊映射（如 arisa -> alisa，用于匹配图片文件名）
  const nameMapping: Record<string, string> = {
    'arisa': 'alisa',
  };
  
  // 如果存在映射，使用映射后的名称来查找配置
  const mappedName = nameMapping[baseName] || baseName;
  
  // 默认位置配置（回复框外部左上方）
  const defaultPosition: NamePosition = {
    top: 'calc(50% - 200px)',
    left: 'calc(50% - 450px)',
    maxHeight: '80px',
    maxWidth: '250px',
  };

  // 各个角色的位置配置（基于头像文件名）
  const positionMap: Record<string, NamePosition> = {
    'ema': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'hiro': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'anan': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'noa': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'leia': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'milia': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'mage': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'nanoka': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'arisa': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'alisa': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'sherry': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'hanna': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'koko': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
    'meruru': {
      top: 'calc(50% - 45px)',
      left: 'calc(50% - 370px)',
      maxHeight: '100px',
      maxWidth: '250px',
    },
  };

  // 返回该角色的配置，如果没有则返回默认配置
  // 先尝试使用映射后的名称，如果找不到再使用原始名称
  return positionMap[mappedName] || positionMap[baseName] || defaultPosition;
};

