/**
 * 证物界面区域配置
 * 定义证物界面上各个可点击区域的位置
 */

export interface EvidenceRegion {
  name: string; // 区域名称
  x1: number; // 矩形区域左上角X坐标
  y1: number; // 矩形区域左上角Y坐标
  x2: number; // 矩形区域右下角X坐标
  y2: number; // 矩形区域右下角Y坐标
  slotIndex?: number; // 如果是证物槽位，指定槽位索引（0-11）
}

// 证物槽位位置（第零张图到第十一张图）
export const evidenceSlots: EvidenceRegion[] = [
  { name: '第零张图', x1: -88, y1: 890, x2: 28, y2: 1006, slotIndex: 0 },
  { name: '第一张图', x1: 92, y1: 890, x2: 208, y2: 1006, slotIndex: 1 },
  { name: '第二张图', x1: 272, y1: 890, x2: 388, y2: 1006, slotIndex: 2 },
  { name: '第三张图', x1: 452, y1: 890, x2: 568, y2: 1006, slotIndex: 3 },
  { name: '第四张图', x1: 632, y1: 890, x2: 748, y2: 1006, slotIndex: 4 },
  { name: '第五张图', x1: 812, y1: 890, x2: 928, y2: 1006, slotIndex: 5 },
  { name: '第六张图', x1: 991, y1: 890, x2: 1107, y2: 1006, slotIndex: 6 },
  { name: '第七张图', x1: 1171, y1: 890, x2: 1287, y2: 1006, slotIndex: 7 },
  { name: '第八张图', x1: 1351, y1: 890, x2: 1467, y2: 1006, slotIndex: 8 },
  { name: '第九张图', x1: 1531, y1: 890, x2: 1647, y2: 1006, slotIndex: 9 },
  { name: '第十张图', x1: 1710, y1: 890, x2: 1826, y2: 1006, slotIndex: 10 },
  { name: '第十一张图', x1: 1890, y1: 890, x2: 2006, y2: 1006, slotIndex: 11 },
];

// 其他区域
export const evidenceRegions: EvidenceRegion[] = [
  ...evidenceSlots,
  { name: '大图', x1: 284, y1: 190, x2: 653, y2: 560 },
  { name: '出示', x1: 276, y1: 640, x2: 655, y2: 750 },
  { name: '名称', x1: 1050, y1: 171, x2: 1050, y2: 171 }, // 名称位置（单点）
  { name: '物品描述', x1: 1102, y1: 269, x2: 1102, y2: 269 }, // 物品描述位置（单点）
  { name: '关闭', x1: 1752, y1: 1, x2: 1917, y2: 142 }, // 关闭区域
];

/**
 * 根据点击坐标查找对应的区域
 * @param x 点击的X坐标（相对于图片的坐标）
 * @param y 点击的Y坐标（相对于图片的坐标）
 * @returns 找到的区域，如果没有找到则返回null
 */
export const findEvidenceRegionByClick = (
  x: number,
  y: number
): EvidenceRegion | null => {
  return (
    evidenceRegions.find(
      (region) =>
        x >= region.x1 &&
        x <= region.x2 &&
        y >= region.y1 &&
        y <= region.y2
    ) || null
  );
};

