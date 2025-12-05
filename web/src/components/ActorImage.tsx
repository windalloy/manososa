/**
 * 角色头像图片组件
 * 
 * 功能：
 * - 显示角色的圆形头像图片
 * - 用于侧边栏和其他需要显示角色头像的地方
 */
import React from "react";
import { Actor } from "../providers/mysteryContext";
import { Image } from "@mantine/core";

interface Props {
  actor: Actor;
  scale?: number; // 缩放比例，可选
}

export default function ActorImage({ actor, scale = 1 }: Props) {
  return (
    <Image
      src={require(`../assets/character_avatars/${actor.image}`)}
      style={{
        width: 50 * scale,
        height: 50 * scale,
        borderRadius: 50 * scale,
      }}
    />
  );
}
