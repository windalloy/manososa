/**
 * 证物显示组件
 * 管理证物界面的显示和交互逻辑
 */

import React, { useRef, useEffect, useState } from 'react';
import { Image } from '@mantine/core';
import { Evidence, obtainEvidence } from '../config/evidence';
import { findEvidenceRegionByClick, evidenceSlots } from '../config/evidenceRegions';
import { Actor, LLMMessage } from '../providers/mysteryContext';
import { clearContinueDialogState } from './Actor';
import evidenceData from '../evidence.json';
import context2Mapping from '../context2Mapping.json';
import evidenceObtainMapping from '../evidenceObtainMapping.json';

interface EvidenceDisplayProps {
  evidenceList: Evidence[];
  selectedEvidence: Evidence | null;
  onSelectEvidence: (evidence: Evidence | null) => void;
  onClose: () => void;
  backgroundImageSrc: string | null;
  currentActorId: number;
  actors: { [id: number]: Actor };
  setActors: React.Dispatch<React.SetStateAction<{ [id: number]: Actor }>>;
  setEvidenceList: React.Dispatch<React.SetStateAction<Evidence[]>>;
  scale?: number; // 缩放比例
  onAction?: () => void; // 行动回调（用于倒计时）
  onContextAdded?: () => void; // 证言更新回调
  onEvidenceObtained?: (evidenceId: string) => void; // 证物更新回调，传递证物ID
  onStandVariantChange?: (variant: string | null) => void; // 立绘变体切换回调
}

// 获取证物图片路径
const getEvidenceItemImageSrc = (imageFileName: string): string | null => {
  try {
    return require(`../assets/evidence/${imageFileName}`);
  } catch {
    return null;
  }
};

// 检测证物中鼠标位置是否在可点击区域
export const checkEvidenceClickableArea = (
  event: React.MouseEvent<HTMLImageElement>
): boolean => {
  const img = event.currentTarget;
  const rect = img.getBoundingClientRect();
  const imgElement = img as HTMLImageElement;
  
  const naturalWidth = imgElement.naturalWidth;
  const naturalHeight = imgElement.naturalHeight;
  
  if (naturalWidth === 0 || naturalHeight === 0) {
    return false;
  }
  
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;
  const scale = Math.min(scaleX, scaleY);
  const actualDisplayWidth = naturalWidth / scale;
  const actualDisplayHeight = naturalHeight / scale;
  const offsetX = (displayWidth - actualDisplayWidth) / 2;
  const offsetY = (displayHeight - actualDisplayHeight) / 2;
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  if (clickX < offsetX || clickX > offsetX + actualDisplayWidth ||
      clickY < offsetY || clickY > offsetY + actualDisplayHeight) {
    return false;
  }
  
  const imageRelativeX = clickX - offsetX;
  const imageRelativeY = clickY - offsetY;
  const imageX = Math.round(imageRelativeX * scale);
  const imageY = Math.round(imageRelativeY * scale);
  
  const region = findEvidenceRegionByClick(imageX, imageY);
  return region !== null;
};

// 处理证物背景图片鼠标移动（动态改变光标）
export const handleEvidenceBackgroundMouseMove = (
  event: React.MouseEvent<HTMLImageElement>
) => {
  const isClickable = checkEvidenceClickableArea(event);
  if (event.currentTarget) {
    event.currentTarget.style.cursor = isClickable ? 'pointer' : 'default';
  }
};

// 处理证物背景图片点击
export const handleEvidenceBackgroundClick = (
  event: React.MouseEvent<HTMLImageElement>,
  evidenceList: Evidence[],
  onSelectEvidence: (evidence: Evidence | null) => void,
  onClose: () => void,
  selectedEvidence: Evidence | null,
  currentActorId: number,
  actors: { [id: number]: Actor },
  setActors: React.Dispatch<React.SetStateAction<{ [id: number]: Actor }>>,
  setEvidenceList: React.Dispatch<React.SetStateAction<Evidence[]>>,
  pageOffset: number,
  onAction?: () => void,
  onContextAdded?: () => void,
  onEvidenceObtained?: (evidenceId: string) => void,
  onStandVariantChange?: (variant: string | null) => void
) => {
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
  
  // 查找点击的区域
  const region = findEvidenceRegionByClick(imageX, imageY);
  
  if (region) {
    // 如果是关闭区域
    if (region.name === '关闭') {
      onClose();
      return;
    }
    
    // 如果是证物槽位（第0张图到第11张图）
    if (region.slotIndex !== undefined) {
      // 获取已获取的证物列表（按ID排序）
      const obtainedEvidences = evidenceList
        .filter(e => e.obtained)
        .sort((a, b) => a.id.localeCompare(b.id));
      
      let evidenceIndex: number;
      
      if (pageOffset === 0) {
        // 初始状态：第1-10张图显示索引0-9
        if (region.slotIndex === 0) {
          return; // 第0张图位置没有证物
        }
        evidenceIndex = region.slotIndex - 1; // 第1-10张图对应索引0-9
      } else {
        // 翻页状态：
        // 第0张图显示索引0
        // 第1-10张图显示索引(pageOffset)到(pageOffset+9)
        // 第11张图显示索引(pageOffset+10)
        if (region.slotIndex === 0) {
          evidenceIndex = 0; // 第0张图显示第一个证物
        } else if (region.slotIndex >= 1 && region.slotIndex <= 10) {
          evidenceIndex = pageOffset + region.slotIndex - 1; // 第1-10张图
        } else if (region.slotIndex === 11) {
          evidenceIndex = pageOffset + 10; // 第11张图
        } else {
          return;
        }
      }
      
      if (evidenceIndex >= 0 && evidenceIndex < obtainedEvidences.length) {
        onSelectEvidence(obtainedEvidences[evidenceIndex]);
      } else {
        onSelectEvidence(null);
      }
      return; // 选中证物后不关闭界面
    }
    
    // 如果是"出示"按钮
    if (region.name === '出示') {
      // 检查是否有选中的证物
      if (!selectedEvidence) {
        return; // 没有选中证物，不处理
      }
      
      // 获取当前正在对话的角色
      const currentActor = actors[currentActorId];
      if (!currentActor) {
        return; // 没有找到当前角色，不处理
      }
      
      // 从 evidence.json 中获取对应的出示事件文本
      const actorName = currentActor.name;
      const evidenceId = selectedEvidence.id;
      
      // 检查 evidence.json 中是否有对应的数据
      const evidenceEvents = evidenceData as Record<string, Record<string, string>>;
      if (evidenceEvents[actorName] && evidenceEvents[actorName][evidenceId]) {
        const messageText = evidenceEvents[actorName][evidenceId];
        
        // 检查是否需要追加 context2、context3、context4 或 lastcontext
        const contextMap = context2Mapping as Record<string, Record<string, "context2" | "context3" | "context4" | "lastcontext" | boolean>>;
        const contextToAdd = contextMap[actorName] && contextMap[actorName][evidenceId];
        const shouldAddContext = contextToAdd === "context2" || contextToAdd === "context3" || contextToAdd === "context4" || contextToAdd === "lastcontext";
        
        // 清除该角色的"继续对话"状态，确保显示回复框
        clearContinueDialogState(currentActorId);
        
        // 先添加用户消息：出示证物
        const userMessage: LLMMessage = {
          role: 'user',
          content: `（出示${selectedEvidence.name}）`,
        };
        
        // 再添加角色回复消息
        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: messageText,
        };
        
        // 先检查是否会获得新证物（从配置文件中读取规则）
        const obtainMap = evidenceObtainMapping as Record<string, Record<string, string>>;
        const evidenceToObtain = obtainMap[actorName]?.[evidenceId];
        const willObtainEvidence = evidenceToObtain && evidenceList.find(e => e.id === evidenceToObtain && !e.obtained);
        
        setActors((all) => {
          const newActors = { ...all };
          const currentActorData = newActors[currentActorId];
          
          // 如果需要追加 context2、context3、context4 或 lastcontext，则将对应内容追加到 context1（仅第一次触发）
          if (shouldAddContext) {
            let contextToAppend = '';
            const context1Content = currentActorData.context1 || '';
            
            if (contextToAdd === "context2" && currentActorData.context2 && currentActorData.context2.trim() !== '') {
              contextToAppend = currentActorData.context2;
            } else if (contextToAdd === "context3" && currentActorData.context3 && currentActorData.context3.trim() !== '') {
              contextToAppend = currentActorData.context3;
            } else if (contextToAdd === "context4" && currentActorData.context4 && currentActorData.context4.trim() !== '') {
              contextToAppend = currentActorData.context4;
            } else if (contextToAdd === "lastcontext" && currentActorData.lastcontext && currentActorData.lastcontext.trim() !== '') {
              // lastcontext 的特殊逻辑：必须先检查 context2、context3 和 context4 是否都已添加到 context1
              const context2Content = currentActorData.context2 || '';
              const context3Content = currentActorData.context3 || '';
              const context4Content = currentActorData.context4 || '';
              
              // 检查 context2 是否已添加（如果 context2 存在）
              const context2Added = context2Content.trim() === '' || context1Content.includes(context2Content.trim());
              // 检查 context3 是否已添加（如果 context3 存在）
              const context3Added = context3Content.trim() === '' || context1Content.includes(context3Content.trim());
              // 检查 context4 是否已添加（如果 context4 存在）
              const context4Added = context4Content.trim() === '' || context1Content.includes(context4Content.trim());
              
              // 只有当 context2、context3 和 context4 都已添加（或不存在）时，才允许添加 lastcontext
              if (context2Added && context3Added && context4Added) {
                contextToAppend = currentActorData.lastcontext;
              }
              // 否则不添加 lastcontext（contextToAppend 保持为空字符串）
            }
            
            // 检查 context1 中是否已经包含要追加的内容，避免重复追加
            if (contextToAppend) {
              const trimmedContext = contextToAppend.trim();
              // 如果 context1 中已经包含要追加的内容，则不再追加
              if (!context1Content.includes(trimmedContext)) {
                const separator = context1Content.trim() !== '' ? '\n\n' : '';
                // 追加时也使用 trim 后的内容，保持一致性
                currentActorData.context1 = context1Content + separator + trimmedContext;
                // 通知有新证言添加（但如果同时会获得证物，则不显示证言更新）
                if (onContextAdded && !willObtainEvidence) {
                  onContextAdded();
                }
              }
            }
          }
          
          newActors[currentActorId] = {
            ...currentActorData,
            messages: [
              ...currentActorData.messages,
              userMessage,
              assistantMessage,
            ],
          };
          return newActors;
        });
        
        // 根据证物对应的 context 切换立绘变体
        if (onStandVariantChange) {
          if (contextToAdd === "context2") {
            onStandVariantChange("_2");
          } else if (contextToAdd === "context3") {
            onStandVariantChange("_3");
          } else if (contextToAdd === "context4") {
            onStandVariantChange("_4");
          } else if (contextToAdd === "lastcontext") {
            onStandVariantChange("_l");
          } else {
            // 如果证物不能获取任何 context（false 或 undefined），切换回基础立绘
            onStandVariantChange(null);
          }
        }
        
        // 检查是否需要获得新证物（从配置文件中读取规则）
        if (evidenceToObtain) {
          setEvidenceList((prevList) => {
            const targetEvidence = prevList.find(e => e.id === evidenceToObtain);
            if (targetEvidence && !targetEvidence.obtained) {
              // 通知有新证物获取，传递证物ID
              if (onEvidenceObtained) {
                onEvidenceObtained(evidenceToObtain);
              }
              return obtainEvidence(evidenceToObtain, prevList);
            }
            return prevList;
          });
        }
      }
      
      // 出示后关闭证物界面
      onClose();
      // 触发行动回调（用于倒计时）
      if (onAction) {
        onAction();
      }
      return;
    }
  }
};

// 证物显示组件
export const EvidenceDisplay: React.FC<EvidenceDisplayProps> = ({
  evidenceList,
  selectedEvidence,
  onSelectEvidence,
  onClose,
  backgroundImageSrc,
  currentActorId,
  actors,
  setActors,
  setEvidenceList,
  scale = 1,
  onAction,
  onContextAdded,
  onEvidenceObtained,
  onStandVariantChange,
}) => {
  // 背景图片的引用
  const bgImageRef = useRef<HTMLImageElement>(null);
  
  // 背景图片的实际显示位置和尺寸
  const [bgImageLayout, setBgImageLayout] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);
  
  // 获取已获取的证物列表（按ID排序）
  const obtainedEvidences = evidenceList
    .filter(e => e.obtained)
    .sort((a, b) => a.id.localeCompare(b.id));
  
  // 翻页状态：当前显示的起始索引（0表示显示索引0-9，1表示索引0移到第0张图，索引1-10显示在第1-10张图）
  const [pageOffset, setPageOffset] = useState(0);
  
  // 计算是否可以翻页
  // 向左翻页：如果第0张图位置有图片（pageOffset > 0），可以向左翻页
  const canPageLeft = obtainedEvidences.length > 10 && pageOffset > 0;
  // 向右翻页：如果第11张图位置有图片（pageOffset + 10 < obtainedEvidences.length），可以向右翻页
  const canPageRight = obtainedEvidences.length > 10 && pageOffset + 10 < obtainedEvidences.length;
  
  // 获取当前页显示的证物列表
  // 如果 pageOffset === 0：显示索引0-9（第1-10张图位置）
  // 如果 pageOffset > 0：索引0显示在第0张图位置，索引(pageOffset)到(pageOffset+9)显示在第1-10张图位置，索引(pageOffset+10)显示在第11张图位置
  const displayedEvidences = pageOffset === 0 
    ? obtainedEvidences.slice(0, 10)  // 显示前10个（第1-10张图位置）
    : [
        obtainedEvidences[0],  // 第0张图
        ...obtainedEvidences.slice(pageOffset, pageOffset + 10),  // 第1-10张图
        ...(obtainedEvidences.length > pageOffset + 10 ? [obtainedEvidences[pageOffset + 10]] : [])  // 第11张图（如果存在）
      ];
  
  // 假设背景图片的原始尺寸为1920x1080（根据实际图片尺寸调整）
  const BG_ORIGINAL_WIDTH = 1920;
  const BG_ORIGINAL_HEIGHT = 1080;
  
  // 计算背景图片的实际显示位置和尺寸
  const calculateBgImageLayout = () => {
    if (!bgImageRef.current) return;
    
    const img = bgImageRef.current;
    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth || BG_ORIGINAL_WIDTH;
    const naturalHeight = img.naturalHeight || BG_ORIGINAL_HEIGHT;
    
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
    
    setBgImageLayout({
      left: rect.left + offsetX,
      top: rect.top + offsetY,
      width: actualDisplayWidth,
      height: actualDisplayHeight,
      naturalWidth,
      naturalHeight,
    });
  };
  
  // 监听图片加载和窗口大小变化
  useEffect(() => {
    if (!bgImageRef.current) return;
    
    const img = bgImageRef.current;
    
    // 如果图片已经加载完成，立即计算
    if (img.complete) {
      calculateBgImageLayout();
    } else {
      // 否则等待图片加载完成
      img.addEventListener('load', calculateBgImageLayout);
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', calculateBgImageLayout);
    
    return () => {
      img.removeEventListener('load', calculateBgImageLayout);
      window.removeEventListener('resize', calculateBgImageLayout);
    };
  }, [backgroundImageSrc]);
  
  // 根据背景图片的实际显示位置和尺寸计算证物的绝对位置
  const getEvidencePosition = (x: number, y: number, width: number, height: number) => {
    if (!bgImageLayout) return null;
    
    // 计算缩放比例（基于实际显示尺寸和原始尺寸）
    // bgImageLayout.width 和 bgImageLayout.height 已经是考虑了 objectFit: contain 后的实际显示尺寸
    const scaleX = bgImageLayout.width / bgImageLayout.naturalWidth;
    const scaleY = bgImageLayout.height / bgImageLayout.naturalHeight;
    // 由于使用了 objectFit: contain，实际显示的图片会保持宽高比，所以使用较小的缩放比例
    const scale = Math.min(scaleX, scaleY);
    
    // 计算在背景图片原始尺寸中的相对位置
    const relativeX = (x / BG_ORIGINAL_WIDTH) * bgImageLayout.naturalWidth;
    const relativeY = (y / BG_ORIGINAL_HEIGHT) * bgImageLayout.naturalHeight;
    
    // 转换为实际显示位置（基于背景图片的实际显示位置）
    const actualX = bgImageLayout.left + relativeX * scale;
    const actualY = bgImageLayout.top + relativeY * scale;
    const actualWidth = (width / BG_ORIGINAL_WIDTH) * bgImageLayout.naturalWidth * scale;
    const actualHeight = (height / BG_ORIGINAL_HEIGHT) * bgImageLayout.naturalHeight * scale;
    
    return {
      left: actualX,
      top: actualY,
      width: actualWidth,
      height: actualHeight,
    };
  };
  
  return (
    <>
      {/* 证物背景图片 - 全屏显示 */}
      {backgroundImageSrc && (
        <Image
          ref={bgImageRef}
          src={backgroundImageSrc}
          alt="Evidence Background"
          onClick={(e) => handleEvidenceBackgroundClick(e, evidenceList, onSelectEvidence, onClose, selectedEvidence, currentActorId, actors, setActors, setEvidenceList, pageOffset, onAction, onContextAdded, onEvidenceObtained, onStandVariantChange)}
          onMouseMove={handleEvidenceBackgroundMouseMove}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            cursor: 'default', // 默认箭头光标，根据鼠标位置动态改变
          }}
        />
      )}
      
      {/* 证物内容层 - 叠加在背景图片上 */}
      {backgroundImageSrc && bgImageLayout && (
        <div
          style={{
            position: 'fixed',
            left: `${bgImageLayout.left}px`,
            top: `${bgImageLayout.top}px`,
            width: `${bgImageLayout.width}px`,
            height: `${bgImageLayout.height}px`,
            pointerEvents: 'none', // 不拦截点击事件，让背景图片可以接收点击
            overflow: 'hidden', // 裁剪超出背景图的部分
          }}
        >
          {/* 证物缩略图 */}
          {displayedEvidences.map((evidence, index) => {
            // 如果 pageOffset === 0：所有证物显示在第1-10张图位置（索引1-10）
            // 如果 pageOffset > 0：第一个证物（index=0）显示在第0张图位置（索引0），后续10个显示在第1-10张图位置（索引1-10），第12个显示在第11张图位置（索引11）
            const slotIndex = pageOffset === 0 ? index + 1 : index;
            if (slotIndex >= evidenceSlots.length) return null;
            const slot = evidenceSlots[slotIndex];
            const slotWidth = slot.x2 - slot.x1;
            const slotHeight = slot.y2 - slot.y1;
            const evidenceImageSrc = getEvidenceItemImageSrc(evidence.image);
            
            // 计算槽位中心位置
            const slotCenterX = (slot.x1 + slot.x2) / 2;
            const slotCenterY = (slot.y1 + slot.y2) / 2;
            
            const position = getEvidencePosition(slotCenterX, slotCenterY, slotWidth, slotHeight);
            if (!position) return null;
            
            // 将绝对位置转换为相对于背景图容器的位置
            const relativeLeft = position.left - bgImageLayout.left;
            const relativeTop = position.top - bgImageLayout.top;
            
            return (
              <div
                key={evidence.id}
                style={{
                  position: 'absolute',
                  left: `${relativeLeft}px`,
                  top: `${relativeTop}px`,
                  transform: 'translate(-50%, -50%)',
                  width: `${position.width}px`,
                  height: `${position.height}px`,
                  pointerEvents: 'auto', // 允许点击
                  cursor: 'pointer',
                  overflow: 'hidden', // 裁剪超出部分
                }}
                onClick={() => onSelectEvidence(evidence)}
              >
                {evidenceImageSrc && (
                  <img
                    src={evidenceImageSrc}
                    alt={evidence.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>
            );
          })}
          
          {/* 翻页可点击区域 */}
          {obtainedEvidences.length > 10 && (
            <>
              {/* 向左翻页可点击区域 */}
              {canPageLeft && (() => {
                const position = getEvidencePosition(17, 890, 80 - 17, 1006 - 890);
                if (!position) return null;
                const relativeLeft = position.left - bgImageLayout.left;
                const relativeTop = position.top - bgImageLayout.top;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${relativeLeft}px`,
                      top: `${relativeTop}px`,
                      width: `${position.width}px`,
                      height: `${position.height}px`,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageOffset(prev => Math.max(0, prev - 1));
                    }}
                  />
                );
              })()}
              
              {/* 向右翻页可点击区域 */}
              {canPageRight && (() => {
                const position = getEvidencePosition(1833, 890, 1901 - 1833, 1006 - 890);
                if (!position) return null;
                const relativeLeft = position.left - bgImageLayout.left;
                const relativeTop = position.top - bgImageLayout.top;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${relativeLeft}px`,
                      top: `${relativeTop}px`,
                      width: `${position.width}px`,
                      height: `${position.height}px`,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageOffset(prev => Math.min(obtainedEvidences.length - 10, prev + 1));
                    }}
                  />
                );
              })()}
            </>
          )}
          
          {/* 大图显示 */}
          {selectedEvidence && (() => {
            const bigImageSrc = getEvidenceItemImageSrc(selectedEvidence.image);
            // 大图区域：X1: 284, Y1: 190, X2: 653, Y2: 560
            const bigImageX = (284 + 653) / 2;
            const bigImageY = (190 + 560) / 2;
            const bigImageWidth = 653 - 284;
            const bigImageHeight = 560 - 190;
            
            const position = getEvidencePosition(bigImageX, bigImageY, bigImageWidth, bigImageHeight);
            if (!position) return null;
            const relativeLeft = position.left - bgImageLayout.left;
            const relativeTop = position.top - bgImageLayout.top;
            
            return (
              <>
                {/* 大图光标覆盖层 - 确保大图区域显示箭头光标 */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${relativeLeft}px`,
                    top: `${relativeTop}px`,
                    transform: 'translate(-50%, -50%)',
                    width: `${position.width}px`,
                    height: `${position.height}px`,
                    pointerEvents: 'auto', // 允许接收鼠标事件以改变光标
                    cursor: 'default', // 箭头光标
                    backgroundColor: 'transparent', // 透明，不遮挡内容
                    zIndex: 10, // 确保在大图之上
                  }}
                  onMouseMove={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡到背景图片
                  }}
                />
                {/* 大图图片 */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${relativeLeft}px`,
                    top: `${relativeTop}px`,
                    transform: 'translate(-50%, -50%)',
                    width: `${position.width}px`,
                    height: `${position.height}px`,
                    pointerEvents: 'none',
                    zIndex: 9, // 在覆盖层之下
                  }}
                >
                  {bigImageSrc && (
                    <img
                      src={bigImageSrc}
                      alt={selectedEvidence.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                </div>
              </>
            );
          })()}
          
          {/* 名称显示 */}
          {selectedEvidence && (() => {
            const position = getEvidencePosition(1050, 171, 0, 0);
            if (!position) return null;
            const relativeLeft = position.left - bgImageLayout.left - 7;
            const relativeTop = position.top - bgImageLayout.top - 58; // 上移20px
            
            // 拆分名称：第一个字和其余字
            const firstChar = selectedEvidence.name.charAt(0);
            const restChars = selectedEvidence.name.slice(1);
            
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${relativeLeft}px`,
                  top: `${relativeTop}px`,
                  color: '#222222',
                  fontWeight: 900,
                  fontFamily: '"方正公文小标宋", "FangZheng GongWen XiaoBiaoSong", serif',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ 
                  fontSize: `${48 * scale}px`, 
                  fontWeight: 900, 
                  WebkitTextStroke: `${0.5 * scale}px #222222`,
                  textShadow: `0 0 ${2 * scale}px rgba(0,0,0,0.1), 0 0 ${1 * scale}px rgba(0,0,0,0.3)`,
                  paintOrder: 'stroke fill'
                }}>{firstChar}</span>
                <span style={{ 
                  fontSize: `${32 * scale}px`, 
                  fontWeight: 900, 
                  WebkitTextStroke: `${0.4 * scale}px #222222`,
                  textShadow: `0 0 ${1.5 * scale}px rgba(0,0,0,0.1), 0 0 ${0.5 * scale}px rgba(0,0,0,0.3)`,
                  paintOrder: 'stroke fill'
                }}>{restChars}</span>
              </div>
            );
          })()}
          
          {/* 物品描述显示 */}
          {selectedEvidence && (() => {
            const position = getEvidencePosition(1102, 269, 0, 0);
            if (!position) return null;
            const relativeLeft = position.left - bgImageLayout.left - 45;
            const relativeTop = position.top - bgImageLayout.top - 25; // 上移20px
            
            // 计算最大宽度（从描述位置到图片右边缘，减去右边距）
            const rightMargin = 40; // 右边距（像素）
            const maxWidth = bgImageLayout.width - relativeLeft - rightMargin;
            
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${relativeLeft}px`,
                  top: `${relativeTop}px`,
                  color: '#222222',
                  fontSize: `${18 * scale}px`,
                  fontFamily: '"方正公文小标宋", "FangZheng GongWen XiaoBiaoSong", serif',
                  pointerEvents: 'none',
                  fontWeight: 900,
                  WebkitTextStroke: `${0.2 * scale}px #222222`,
                  textShadow: `0 0 ${1.5 * scale}px rgba(0,0,0,0.5), 0 0 ${0.5 * scale}px rgba(0,0,0,0.3)`,
                  paintOrder: 'stroke fill',
                  maxWidth: `${maxWidth}px`,
                  wordWrap: 'break-word',
                }}
              >
                {selectedEvidence.description}
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
};

