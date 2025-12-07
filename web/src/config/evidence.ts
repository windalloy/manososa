/**
 * 证物管理配置
 * 定义所有证物及其属性
 */

export interface Evidence {
  id: string; // 证物ID
  name: string; // 证物名称
  description: string; // 物品描述
  image: string; // 对应图片文件名（如 "01.webp"）
  obtained: boolean; // 获取状态
}

// 初始证物数据
export const initialEvidence: Evidence[] = [
  {
    id: '01',
    name: '希罗的钢笔',
    description: '一支钢笔，是初中时朋友赠送给我的礼物。',
    image: '01.webp',
    obtained: true, // 初始已获取
  },
  {
    id: '02',
    name: '蕾雅的佩剑',
    description: '属于莲见蕾雅的舞台用刺剑，装饰华丽。该剑作为凶器被发现在案发现场图书室里，自背后刺入玛格尸体。',
    image: '02.webp',
    obtained: true,
  },
  {
    id: '03',
    name: '艾玛的衣服',
    description: '在焚烧炉内发现的樱羽艾玛换下的衣物。表面除少女的体香和烟熏的气味外，还附着少量樱花碎瓣与灰烬。',
    image: '03.webp',
    obtained: false,
  },
  {
    id: '04',
    name: '扫帚',
    description: '原应存放于楼梯旁工具柜的可拆卸扫帚，意外出现在图书室。扫帚上夹杂着少许樱花，没有被拆卸过的痕迹。',
    image: '04.webp',
    obtained: true,
  },
  {
    id: '05',
    name: '被拆解的弩枪',
    description: '在地精之室角落发现的弩枪，已被拆解为若干部件。所有零件都未见缺损，唯配套弩箭下落不明。',
    image: '05.webp',
    obtained: false,
  },
  {
    id: '06',
    name: '人字梯',
    description: '在监牢入口找到的人字梯，通常存放在杂物间里。梯子的顶端和脚踏板上有新鲜的泥土痕迹，显示近期曾被移动并使用。',
    image: '06.webp',
    obtained: false,
  },
  {
    id: '07',
    name: '诺亚的素描本',
    description: '在画室发现的素描本，上面画有一只紫色蝴蝶，该图案似乎由魔法绘制而成，形态生动逼真，散发着轻微的醉人香气。',
    image: '07.webp',
    obtained: false,
  },
  {
    id: '08',
    name: '染血的发带',
    description: '在图书室找到的黑色发带，一端浸染了血迹。经辨认，此发带属于黑部奈叶香。',
    image: '08.webp',
    obtained: true,
  },
  {
    id: '09',
    name: '药瓶',
    description: '湖边拾获的透明药剂瓶，内壁残留少量透明液体。瓶身无任何标识，液体成分待进一步检验。',
    image: '09.webp',
    obtained: false,
  },
  {
    id: '10',
    name: '仪礼剑',
    description: '在仓库发现的未知来源直剑，剑身铭刻特殊纹样，刃部沾有血迹。',
    image: '10.webp',
    obtained: false,
  },
  {
    id: '11',
    name: '艾玛的证言',
    description: '根据艾玛的回忆，她下午长时间待在玄关大厅，并记录了特定时间段内人员的进出情况：14:10 蕾雅持花环进入。14:30 梅露露空手离开。14:40 汉娜与米莉亚空手离开。15:00-15:10 米莉亚两次单独进出。15:30 亚里沙持药瓶离开。15:40 梅露露返回建筑。',
    image: '11.webp',
    obtained: false,
  },
  {
    id: '12',
    name: '艾玛的证言2',
    description: '根据艾玛的回忆，中午12:00时，除了梅露露和奈叶香以外的所有人都在食堂用餐。用餐期间，蕾雅曾邀请艾玛表演舞台剧，被艾玛婉拒了。',
    image: '12.webp',
    obtained: false,
  },
  {
    id: '13',
    name: '可可的证言',
    description: '泽渡可可声称，她下午通过直播的“俯瞰”能力，确认了多位少女在特定时间点的所在位置。13:30-14:40，安安和诺亚一直在画室。13:00-14:40，亚里沙和米莉亚一直在娱乐室，14:20-14:40，蕾雅在娱乐室。13:30-14:10，奈叶香一直在火精之室。',
    image: '13.webp',
    obtained: false,
  },
  {
    id: '14',
    name: '汉娜的证言',
    description: '远野汉娜陈述在15:00左右，发现仓库出现在监牢入口的位置，自己借助人字梯而非魔法攀至仓库顶部，透过彩色玻璃窗目击了内部发生的杀人案件。',
    image: '14.webp',
    obtained: false,
  },
  {
    id: '15',
    name: '亚里沙的证言',
    description: '紫藤亚里沙似乎不小心弄伤了自己的手臂，后续前往医务室取得药品，并于湖边将伤药涂抹在了伤口上。',
    image: '15.webp',
    obtained: false,
  },
];

/**
 * 根据证物ID获取证物
 */
export const getEvidenceById = (id: string, evidenceList: Evidence[]): Evidence | undefined => {
  return evidenceList.find(evidence => evidence.id === id);
};

/**
 * 根据图片文件名获取证物
 */
export const getEvidenceByImage = (image: string, evidenceList: Evidence[]): Evidence | undefined => {
  return evidenceList.find(evidence => evidence.image === image);
};

/**
 * 设置证物为已获取状态
 * 如果证物已经获取，不会重复触发
 */
export const obtainEvidence = (id: string, evidenceList: Evidence[]): Evidence[] => {
  return evidenceList.map(evidence => {
    if (evidence.id === id && !evidence.obtained) {
      return { ...evidence, obtained: true };
    }
    return evidence;
  });
};

