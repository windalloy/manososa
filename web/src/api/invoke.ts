import { Actor } from "../providers/mysteryContext";
import { API_URL } from "../constants";

export interface InvokeParams {
  globalStory: string;
  actor: Actor;
  sessionId: string;
  characterFileVersion: string;
}

export interface InvokeResponse {
  original_response: string;
  critique_response: string;
  problems_detected: boolean;
  final_response: string;
  refined_response: string;
}

export default async function invokeAI({
  globalStory,
  actor,
  sessionId,
  characterFileVersion,
}: InvokeParams): Promise<InvokeResponse> {
  if (!API_URL) {
    throw new Error('API URL 未配置。请设置 REACT_APP_API_URL 环境变量或确保后端服务正在运行。');
  }

  const resp = await fetch(`${API_URL}/invoke/`, {
    method: "POST",
    body: JSON.stringify({
      global_story: globalStory,
      actor,
      session_id: sessionId,
      character_file_version: characterFileVersion,
    }),    
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => '未知错误');
    throw new Error(`API 请求失败: ${resp.status} ${resp.statusText}. ${errorText}`);
  }

  try {
  return await resp.json();
  } catch (error) {
    throw new Error(`解析响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
