/**
 * 二阶堂希罗的记忆管理工具
 * 用于记录所有对话和证物出示，并转换为 context1
 */

const DETECTIVE_NAME = '二阶堂希罗';
const MAX_TOKENS = 2000; // 最大 token 限制

/**
 * 估算文本的 token 数
 * 简单估算：中文字符每个约 1.5 token，英文字符每个约 0.5 token
 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    if (char >= '\u4e00' && char <= '\u9fff') {
      tokens += 1.5; // 中文字符
    } else {
      tokens += 0.5; // 英文字符、数字、标点等
    }
  }
  return Math.ceil(tokens);
}

/**
 * 限制记忆数组的 token 数，保留最近的记录
 */
export function limitMemoryByTokens(memory: string[]): string[] {
  let totalTokens = 0;
  const result: string[] = [];
  
  // 从后往前遍历（最新的在前），累加 token 数
  for (let i = memory.length - 1; i >= 0; i--) {
    const item = memory[i];
    const itemTokens = estimateTokens(item);
    
    if (totalTokens + itemTokens <= MAX_TOKENS) {
      result.unshift(item); // 插入到数组开头
      totalTokens += itemTokens;
    } else {
      break; // 超过限制，停止添加
    }
  }
  
  return result;
}

/**
 * 记录对话到记忆
 */
export function recordDialogue(
  memory: string[],
  actorName: string,
  userInput: string,
  actorResponse: string
): string[] {
  const record = `[对话] 与${actorName}的对话：\n问：${userInput}\n答：${actorResponse}`;
  const newMemory = [...memory, record];
  return limitMemoryByTokens(newMemory);
}

/**
 * 记录证物出示到记忆
 */
export function recordEvidence(
  memory: string[],
  actorName: string,
  evidenceName: string,
  evidenceDescription: string
): string[] {
  const record = `[证物] 向${actorName}出示了${evidenceName}：\n${evidenceDescription}`;
  const newMemory = [...memory, record];
  return limitMemoryByTokens(newMemory);
}

/**
 * 将记忆数组转换为 context1 格式的字符串
 */
export function memoryToContext1(memory: string[]): string {
  if (memory.length === 0) {
    return '';
  }
  return memory.join('\n\n');
}

/**
 * 检查是否是二阶堂希罗
 */
export function isDetective(actorName: string): boolean {
  return actorName === DETECTIVE_NAME;
}

/**
 * 从用户消息中提取实际输入（去除"二阶堂希罗: "前缀）
 */
export function extractUserInput(messageContent: string): string {
  const prefix = '二阶堂希罗: ';
  if (messageContent.startsWith(prefix)) {
    return messageContent.slice(prefix.length);
  }
  return messageContent;
}

