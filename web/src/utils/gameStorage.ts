/**
 * 游戏进度存储工具
 * 使用 localStorage 保存和恢复游戏状态
 */

const STORAGE_KEY = 'MYSTERY_GAME_PROGRESS';

export interface SavedGameState {
  // 对话相关
  actors: { [id: number]: any };
  globalStory: string;
  
  // 游戏状态
  actionCountdown: number;
  endGame: boolean;
  postGame: boolean;
  countdownEnded: boolean;
  currActor: number;
  
  // 证物和笔记
  evidenceList: any[];
  notes: Array<{ id: number; content: string }>;
  nextNoteId: number;
  
  // UI状态
  bgImage: string;
  currentMapIndex: number;
  
  // 版本号，用于未来兼容性检查
  version: string;
}

const CURRENT_VERSION = '1.0.0';

/**
 * 保存游戏进度
 */
export function saveGameProgress(state: Partial<SavedGameState>): void {
  try {
    const savedState: SavedGameState = {
      ...state,
      version: CURRENT_VERSION,
    } as SavedGameState;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  } catch (error) {
    console.error('Failed to save game progress:', error);
  }
}

/**
 * 加载游戏进度
 */
export function loadGameProgress(): Partial<SavedGameState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }
    
    const state = JSON.parse(saved) as SavedGameState;
    
    // 检查版本兼容性（未来可以添加版本迁移逻辑）
    if (state.version !== CURRENT_VERSION) {
      console.warn('Game progress version mismatch, may need migration');
    }
    
    return state;
  } catch (error) {
    console.error('Failed to load game progress:', error);
    return null;
  }
}

/**
 * 清除游戏进度
 */
export function clearGameProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game progress:', error);
  }
}

/**
 * 检查是否有保存的游戏进度
 */
export function hasGameProgress(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}


