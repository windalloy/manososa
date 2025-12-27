/**
 * 侧边栏角色头像组件
 * 
 * 功能：
 * - 在侧边栏中显示单个角色的头像和名称
 * - 高亮显示当前选中的角色
 * - 处理点击事件切换当前对话角色
 * - 游戏结束后禁用点击功能
 */
import React from "react";
import { Actor } from "../providers/mysteryContext";
import { Group, Text } from "@mantine/core";
import ActorImage from "./ActorImage";
import { getCharacterColor, blendColorWithBlack } from "../config/characterColors";

interface Props {
  actor: Actor;
  currentActor: number;
  setCurrentActor: (actor: number) => void;
  postGame: boolean;
  scale: number; // 缩放比例
}

export default function SidebarAvatar({
  actor,
  currentActor,
  setCurrentActor,
  postGame,
  scale,
}: Props) {
  const active = actor.id === currentActor;
  
  // 获取角色对应的颜色
  const characterColor = getCharacterColor(actor.name);
  const characterColorHex = `#${characterColor}`;
  
  // 创建渐变：中间统一颜色（黑色），边缘使用角色颜色
  // 激活状态时边缘颜色更明显，非激活状态时边缘颜色较淡
  const centerColor = 'rgba(0, 0, 0, 0.7)'; // 中间统一颜色
  const edgeColorActive = blendColorWithBlack(characterColor, active ? 0.4 : 0.2); // 激活时边缘颜色更明显
  const edgeColor = blendColorWithBlack(characterColor, 0.2); // 非激活时边缘颜色较淡
  
  // 获取角色名称的首字
  const firstChar = actor.name.charAt(0);
  const restChars = actor.name.slice(1);

  return (
    <Group
      onClick={() => {
        if (!postGame) {
          setCurrentActor(actor.id);
        }
      }}
      style={{
        cursor: postGame ? "not-allowed" : "pointer",
        background: `linear-gradient(to right, ${active ? edgeColorActive : edgeColor} 0%, ${active ? edgeColorActive : edgeColor} 10%, ${centerColor} 30%, ${centerColor} 70%, ${active ? edgeColorActive : edgeColor} 90%, ${active ? edgeColorActive : edgeColor} 100%)`,
        padding: `${4 * scale}px ${8 * scale}px`,
        borderRadius: `${8 * scale}px`,
        marginBottom: `${3 * scale}px`,
        flexWrap: 'nowrap', // 强制不换行
        whiteSpace: 'nowrap', // 防止文本换行
        overflow: 'hidden', // 如果内容过长，隐藏而不是换行
        transition: 'background 0.3s ease',
      }}
    >
      <ActorImage actor={actor} scale={scale} />
      <Text 
        style={{ 
          color: 'white', 
          fontSize: `${15 * scale}px`,
          whiteSpace: 'nowrap', // 防止文本换行
          flexShrink: 0, // 防止文本被压缩
          minWidth: 0, // 允许flex布局正常工作
        }}
      >
        <span style={{ color: characterColorHex }}>{firstChar}</span>
        {restChars}
      </Text>
    </Group>
  );
}

