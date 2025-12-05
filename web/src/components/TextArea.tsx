/**
 * 笔记文本区域组件
 * 
 * 功能：
 * - 提供玩家记录游戏笔记的文本输入框
 * - 支持自动调整高度
 * - 用于玩家在游戏过程中记录线索和推理
 */
import React from 'react';
import { Textarea, Title } from '@mantine/core';

const TextArea: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Title order={5}>Your notes</Title>
      <div style={{ marginTop: '10px', flex: 1, display: 'flex', flexDirection: 'column', height: '60vh' }}>
        <Textarea
          autosize
          minRows={10}
          maxRows={10}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default TextArea;