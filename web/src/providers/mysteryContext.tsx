import constate from "constate";
import { useState } from "react";
import Story from "../characters.json";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Actor {
  id: number;
  name: string;
  bio: string;
  personality: string;
  context1: string;
  context2?: string;
  context3?: string;
  context4?: string;
  lastcontext?: string;
  secret: string;
  violation: string;
  image: string;
  messages: LLMMessage[];
  detectiveMemory?: string[]; // 二阶堂希罗的记忆：存储所有对话和证物出示记录
}

const INITIAL_CHARACTERS = Story.characters.map(
  ({ name, bio, personality, context1, context2, context3, context4, lastcontext, secret, violation, image }, i) => ({
    id: i,
    name,
    bio,
    personality,
    context1,
    context2: context2 ?? "",
    context3: context3 ?? "",
    context4: context4 ?? "",
    lastcontext: lastcontext ?? "",
    secret: secret ?? "",
    violation: violation ?? "",
    image,
    messages: [],
  }),
);

export let INITIAL_CHARACTERS_BY_ID: { [id: number]: Actor } = {};

INITIAL_CHARACTERS.forEach((c) => {
  INITIAL_CHARACTERS_BY_ID[c.id] = c;
});

export const [MysteryProvider, useMysteryContext] = constate(() => {
  const [globalStory, setGlobalStory] = useState(Story.globalStory);
  const [actors, setActors] = useState<{ [id: number]: Actor }>(
    INITIAL_CHARACTERS_BY_ID,
  );

  return {
    globalStory,
    setGlobalStory,
    actors,
    setActors,
  };
});
