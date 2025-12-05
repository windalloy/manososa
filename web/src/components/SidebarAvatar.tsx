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

  return (
    <Group
      onClick={() => {
        if (!postGame) {
          setCurrentActor(actor.id);
        }
      }}
      style={{
        cursor: postGame ? "not-allowed" : "pointer",
        backgroundColor: active ? "rgba(173, 216, 230, 0.5)" : "rgba(0, 0, 0, 0.3)",
        padding: `${4 * scale}px ${8 * scale}px`,
        borderRadius: `${8 * scale}px`,
        marginBottom: `${3 * scale}px`,
      }}
    >
      <ActorImage actor={actor} scale={scale} />
      <Text style={{ color: 'white', fontSize: `${15 * scale}px` }}>{actor.name}</Text>
    </Group>
  );
}

