/**
 * 提示生成器
 * 根据当前游戏状态生成随机线索提示
 */

import { Evidence } from '../config/evidence';
import { Actor } from '../providers/mysteryContext';
import { MapRegion } from '../config/mapRegions';
import context2Mapping from '../context2Mapping.json';

export interface Hint {
  id: string; // 提示的唯一标识
  type: 'location' | 'evidence' | 'testimony';
  message: string;
}

/**
 * 检查角色是否可以获得新的证言
 * @param actor 角色
 * @param evidenceId 证物ID
 * @returns 是否可以获得新证言
 */
function canObtainTestimony(actor: Actor, evidenceId: string): boolean {
  const contextMap = context2Mapping as Record<string, Record<string, "context2" | "context3" | "context4" | "lastcontext" | boolean>>;
  const contextToAdd = contextMap[actor.name]?.[evidenceId];
  
  // 如果映射为 undefined、false 或不是字符串类型，不能获得证言
  if (!contextToAdd || typeof contextToAdd !== 'string') {
    return false;
  }
  
  const context1Content = actor.context1 || '';
  
  // 检查 context2、context3、context4 是否已添加
  if (contextToAdd === "context2") {
    const context2Content = actor.context2 || '';
    // 如果 context2 已存在且未添加到 context1，可以添加
    return context2Content.trim() !== '' && !context1Content.includes(context2Content.trim());
  } else if (contextToAdd === "context3") {
    const context3Content = actor.context3 || '';
    return context3Content.trim() !== '' && !context1Content.includes(context3Content.trim());
  } else if (contextToAdd === "context4") {
    const context4Content = actor.context4 || '';
    return context4Content.trim() !== '' && !context1Content.includes(context4Content.trim());
  } else if (contextToAdd === "lastcontext") {
    // lastcontext 需要检查 context2、context3、context4 是否都已添加
    const context2Content = actor.context2 || '';
    const context3Content = actor.context3 || '';
    const context4Content = actor.context4 || '';
    const lastcontextContent = actor.lastcontext || '';
    
    // 如果 lastcontext 已添加，不能再添加
    if (lastcontextContent.trim() !== '' && context1Content.includes(lastcontextContent.trim())) {
      return false;
    }
    
    // 检查 context2、context3、context4 是否都已添加（或不存在）
    const context2Added = context2Content.trim() === '' || context1Content.includes(context2Content.trim());
    const context3Added = context3Content.trim() === '' || context1Content.includes(context3Content.trim());
    const context4Added = context4Content.trim() === '' || context1Content.includes(context4Content.trim());
    
    // 只有当 context2、context3 和 context4 都已添加（或不存在）时，才允许添加 lastcontext
    return context2Added && context3Added && context4Added && lastcontextContent.trim() !== '';
  }
  
  return false;
}

/**
 * 生成所有可用的提示线索
 * @param evidenceList 当前证物列表
 * @param actors 当前角色列表
 * @param mapRegions 地图区域列表
 * @param shownHintIds 已显示的提示ID集合
 * @returns 可用的提示线索列表
 */
export function generateAvailableHints(
  evidenceList: Evidence[],
  actors: Actor[],
  mapRegions: MapRegion[],
  shownHintIds: Set<string> = new Set()
): Hint[] {
  const hints: Hint[] = [];
  
  // 1. 地点提示：只提示有 obtainEvidenceId 的地点
  const evidenceLocations = mapRegions.filter(
    r => r.obtainEvidenceId && 
         !r.switchMap && 
         !r.closeMap && 
         r.name !== '一层' && 
         r.name !== '二层' && 
         r.name !== '地下一层'
  );
  
  for (const location of evidenceLocations) {
    const evidenceId = location.obtainEvidenceId!;
    const evidence = evidenceList.find(e => e.id === evidenceId);
    
    // 只提示未获取的证物
    if (evidence && !evidence.obtained) {
      const hintId = `location_${evidenceId}`;
      if (!shownHintIds.has(hintId)) {
        hints.push({
          id: hintId,
          type: 'location',
          message: `建议前往"${location.name}"进行调查，那里可能存在着重要的证物。`
        });
      }
    }
  }
  
  // 2. 证言提示：只提示能够获得新证言的证物出示
  const obtainedEvidence = evidenceList.filter(e => e.obtained && !e.name.includes('证言'));
  
  for (const actor of actors) {
    for (const evidence of obtainedEvidence) {
      // 检查是否可以获得新证言
      if (canObtainTestimony(actor, evidence.id)) {
        const hintId = `testimony_${actor.id}_${evidence.id}`;
        if (!shownHintIds.has(hintId)) {
          hints.push({
            id: hintId,
            type: 'testimony',
            message: `建议向"${actor.name}"出示"${evidence.name}"，可能会获得新的证言。`
          });
        }
      }
    }
  }
  
  return hints;
}

/**
 * 生成一个随机提示线索
 * @param evidenceList 当前证物列表
 * @param actors 当前角色列表
 * @param mapRegions 地图区域列表
 * @param shownHintIds 已显示的提示ID集合
 * @returns 提示线索，如果没有可用提示则返回null
 */
export function generateHint(
  evidenceList: Evidence[],
  actors: Actor[],
  mapRegions: MapRegion[],
  shownHintIds: Set<string> = new Set()
): Hint | null {
  const availableHints = generateAvailableHints(evidenceList, actors, mapRegions, shownHintIds);
  
  if (availableHints.length === 0) {
    return null;
  }
  
  // 随机选择一个提示
  const randomIndex = Math.floor(Math.random() * availableHints.length);
  return availableHints[randomIndex];
}

