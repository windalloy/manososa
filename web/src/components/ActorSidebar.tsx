/**
 * 角色侧边栏组件
 * 
 * 功能：
 * - 在侧边栏中显示所有角色的头像列表
 * - 允许用户点击切换当前对话的角色
 * - 游戏结束后禁用角色切换功能
 */
import React from "react";
import { Actor } from "../providers/mysteryContext";
import { Group, Text } from "@mantine/core";
import SidebarAvatar from "./SidebarAvatar";

interface Props {
  currentActor: number;
  setCurrentActor: (actor: number) => void;
  actors: Actor[];
  postGame: boolean;
  scale: number; // 缩放比例
}

export default function ActorSidebar({ currentActor, setCurrentActor, actors, postGame, scale }: Props) {
  return (
    <div 
      style={{ 
        backgroundColor: 'transparent',
        padding: `${10 * scale}px`,
        height: '100%',
        width: '100%',
      }}
    >
      {actors.map(actor => (
        <SidebarAvatar
          key={actor.id}
          actor={actor}
          currentActor={currentActor}
          setCurrentActor={setCurrentActor}
          postGame={postGame}
          scale={scale}
        />
      ))}
    </div>
  );
}