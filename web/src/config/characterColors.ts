/**
 * 角色颜色映射配置
 * 用于输入框和回复框的渐变效果
 */
export const CHARACTER_COLORS: Record<string, string> = {
  '樱羽艾玛': 'fd91af',
  '城崎诺亚': '64dee3',
  '夏目安安': '9f91fb',
  '莲见蕾雅': 'fdb158',
  '远野汉娜': 'a9c71e',
  '橘雪莉': '88b0fb',
  '紫藤亚里沙': 'eb4b3c',
  '泽渡可可': 'fa734d',
  '黑部奈叶香': '838f93',
  '佐伯米莉亚': 'e9cf8d',
  '冰上梅露露': 'e5b8b1',
  '二阶堂希罗': 'A90000',
};

/**
 * 根据角色名称获取颜色（6位十六进制，不含#）
 */
export const getCharacterColor = (characterName: string): string => {
  return CHARACTER_COLORS[characterName] || 'A90000'; // 默认使用二阶堂希罗的红色
};

/**
 * 将6位十六进制颜色转换为rgba格式
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 混合黑色和角色颜色，用于渐变（避免出现白色）
 * ratio: 0 = 纯黑色, 1 = 纯角色颜色
 * alpha: 可选的透明度参数，默认0.7
 */
export const blendColorWithBlack = (hex: string, ratio: number, alpha: number = 0.7): string => {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // 混合：黑色(0,0,0) * (1-ratio) + 角色颜色 * ratio
  const blendedR = Math.round(r * ratio);
  const blendedG = Math.round(g * ratio);
  const blendedB = Math.round(b * ratio);
  // 所有角色使用相同的透明度
  const adjustedAlpha = alpha;
  return `rgba(${blendedR}, ${blendedG}, ${blendedB}, ${adjustedAlpha})`;
};

