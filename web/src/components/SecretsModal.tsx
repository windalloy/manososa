/**
 * 角色秘密显示模态框组件
 * 
 * 功能：
 * - 显示所有角色的秘密信息（剧透内容）
 * - 根据游戏状态（postGame）决定显示清晰版或模糊版图片
 * - 游戏结束后显示清晰版本，游戏进行中显示模糊版本以防止剧透
 */
import React from 'react';
import { Modal, Button, Text, Image, Stack, Group, Anchor } from '@mantine/core';
import secrets from '../assets/secrets.png';
import secrets_blurred from '../assets/secrets_blurred.png';
import { blendColorWithBlack } from '../config/characterColors';

interface SecretsModalProps {
  opened: boolean;
  onClose: () => void;
  postGame: boolean;  // Add postGame prop
}

const SecretsModal: React.FC<SecretsModalProps> = ({ opened, onClose, postGame }) => {
  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      size="xl"
      title={<Text size="lg" fw={700}>Spoilers</Text>}
      styles={{
        content: {
          background: `radial-gradient(circle at center, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.9) 75%, rgba(0, 0, 0, 0.85) 85%, rgba(139, 0, 0, 0.3) 95%, rgba(139, 0, 0, 0.5) 100%)`,
        },
        header: {
          backgroundColor: 'transparent',
        },
        body: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Image 
        src={postGame ? secrets_blurred : secrets}  // Conditionally render image
        style={{marginLeft: '100 auto'}}
      />
      <Button onClick={onClose} fullWidth mt="md">
        Close
      </Button>
    </Modal>
  );
};

export default SecretsModal;