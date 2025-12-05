/**
 * 全局故事编辑组件
 * 
 * 功能：
 * - 提供文本编辑框用于编辑全局故事内容
 * - 全局故事会影响所有角色的对话上下文
 * - 用于开发/调试时动态修改游戏背景设定
 */
import React from "react";
import {useMysteryContext} from "../providers/mysteryContext";
import {Stack, Textarea, Title} from "@mantine/core";


export default function GlobalStory() {
    const { globalStory, setGlobalStory } = useMysteryContext()

    return <Stack>
        <Title order={2}>
            Global Story
        </Title>
        <Textarea value={globalStory} onChange={(event) => setGlobalStory(event.currentTarget.value)} />
    </Stack>
}
