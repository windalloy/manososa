# manososa - 魔女搜查游戏

一个基于 AI 的交互式推理游戏系统，玩家可以与角色对话、收集证物、调查线索，最终推理出真相。

## 📋 目录

- [致谢](#致谢)
- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [重要文件说明](#重要文件说明)
- [本地部署](#本地部署)
- [服务器部署](#服务器部署)
- [配置说明](#配置说明)
- [如何编写自己的剧本](#如何编写自己的剧本)
- [常见问题](#常见问题)

## 🙏 致谢

本项目基于并借鉴了 [AI Alibis: Multi-Agent LLM Murder Mystery](https://github.com/ironman5366/ai-murder-mystery-hackathon) 项目。感谢原项目作者的开源贡献，为本项目提供了重要的技术基础和设计灵感。

## 🎮 项目简介

manososa 是一个基于大语言模型的交互式推理游戏系统（魔女搜查游戏）。玩家扮演侦探，通过：
- **调查**：前往各个地点寻找线索和证物
- **询问**：与角色对话，获取证言
- **出示**：向角色出示证物，改变他们的证言
- **推理**：利用关键证言揭露矛盾

最终在有限的行动次数内找出真相。

## 🛠 技术栈

### 前端
- **React 18** + **TypeScript**
- **Mantine UI** - UI 组件库
- **React Scripts** - 构建工具

### 后端
- **FastAPI** - Python Web 框架
- **DeepSeek** - AI 模型支持

## 📁 项目结构

```
manososa/
├── api/                    # 后端服务
│   ├── main.py            # FastAPI 主入口
│   ├── ai.py              # AI 调用逻辑
│   ├── settings.py        # 配置管理
│   ├── invoke_types.py   # 类型定义
│   ├── requirements.txt   # Python 依赖
│   └── .env              # 环境变量配置（需创建）
│
├── web/                    # 前端应用
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx   # 主页面组件
│   │   ├── components/    # React 组件
│   │   ├── config/        # 配置文件
│   │   ├── assets/        # 图片资源
│   │   ├── characters.json # 角色数据
│   │   ├── evidence.json  # 证物数据
│   │   ├── context2Mapping.json # 证物-证言映射
│   │   └── constants.ts   # 常量配置
│   ├── package.json       # Node.js 依赖
│   └── public/            # 静态资源
│
└── README.md              # 本文件
```

## 📄 重要文件说明

### 后端文件

#### `api/main.py`
- **作用**：FastAPI 应用主入口，处理所有 API 请求
- **关键功能**：
  - `/invoke/` - 处理 AI 对话请求
  - 为"二阶堂希罗"角色的回复添加括号（表示内心独白）

#### `api/ai.py`
- **作用**：AI 模型调用和提示词管理
- **关键函数**：
  - `get_actor_prompt()` - 生成角色提示词
  - `get_system_prompt()` - 生成系统提示词
  - `invoke_anthropic()` / `invoke_openai()` 等 - 调用不同 AI 服务
- **特殊处理**：为"二阶堂希罗"角色使用脑内回想模式的提示词

#### `api/settings.py`
- **作用**：读取环境变量，配置 AI 服务
- **支持的 AI 服务**：
  - DeepSeek（默认）
  - Anthropic Claude
  - OpenAI
  - Groq
  - OpenRouter
  - Ollama（本地部署）

### 前端文件

#### `web/src/pages/Home.tsx`
- **作用**：主页面组件，管理全局状态和游戏流程
- **关键功能**：
  - 角色切换和对话管理
  - 证物展示和出示逻辑
  - 地图交互
  - 背景和立绘切换
  - 行动次数管理

#### `web/src/components/Actor.tsx`
- **作用**：单个角色的对话界面组件
- **功能**：
  - 消息显示和输入
  - AI 对话调用
  - 键盘快捷键（Enter 发送/继续）

#### `web/src/components/EvidenceDisplay.tsx`
- **作用**：证物展示和出示界面
- **功能**：
  - 证物列表展示
  - 点击证物向角色出示
  - 根据证物触发证言更新
  - 立绘变体切换

#### `web/src/characters.json`
- **作用**：定义所有角色的数据
- **结构**：
  ```json
  {
    "fileKey": "stock-characters::v1",
    "globalStory": "全局故事背景",
    "characters": [
      {
        "name": "角色名称",
        "bio": "角色背景",
        "personality": "性格描述",
        "context1": "初始证言",
        "context2": "出示证物02后的证言",
        "context3": "出示证物03后的证言",
        "context4": "出示证物04后的证言",
        "lastcontext": "最终证言",
        "secret": "角色秘密",
        "image": "头像文件名"
      }
    ]
  }
  ```

#### `web/src/evidence.json`
- **作用**：定义所有证物及其属性
- **结构**：
  ```json
  {
    "id": "证物ID",
    "name": "证物名称",
    "description": "描述",
    "image": "图片文件名",
    "obtained": false
  }
  ```

#### `web/src/context2Mapping.json`
- **作用**：定义证物与证言的映射关系
- **结构**：
  ```json
  {
    "角色名称": {
      "证物ID": "context2" | "context3" | "context4" | "lastcontext" | false
    }
  }
  ```
- **说明**：
  - `"context2"` - 出示该证物后，将`context2` 的内容添加到context1中
  - `false` - 出示该证物不会改变证言

#### `web/src/config/evidence.ts`
- **作用**：TypeScript 类型的证物配置
- **用途**：前端代码中使用的证物数据结构

#### `web/src/config/mapRegions.ts`
- **作用**：定义地图上可点击的区域
- **功能**：点击地图区域可以切换背景、获取证物等

#### `web/src/constants.ts`
- **作用**：定义 API URL 等常量
- **功能**：自动检测环境（本地/服务器），构建正确的 API 地址

#### `web/src/assets/`
- **作用**：存放所有图片资源
- **目录结构**：
  - `bg/` - 背景图片（AVIF 格式）
  - `character_stand/` - 角色立绘（WebP 格式）
  - `character_avatars/` - 角色头像（WebP 格式）
  - `character_name/` - 角色名称图片（WebP 格式）
  - `evidence/` - 证物图片（WebP 格式）
  - `map/` - 地图图片（WebP 格式）
  - `ui/` - UI 元素图片（WebP 格式）

## 🚀 本地部署

### 前置要求

1. **Node.js** >= 16.x
2. **Python** >= 3.8
3. **DeepSeek API Key**

### 步骤 1：克隆项目

```bash
git clone <repository-url>
cd manososa
```

### 步骤 2：配置后端

#### 2.1 安装 Python 依赖并启动后端服务

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 10000
```

#### 2.2 创建环境变量文件

在 `api/` 目录下创建 `.env` 文件：

```env
# AI 服务配置
INFERENCE_SERVICE=deepseek
API_KEY=your-deepseek-api-key-here
MODEL=deepseek-chat  # DeepSeek 模型名称
MAX_TOKENS=200

# Ollama 配置（如果使用 Ollama）
OLLAMA_URL=http://localhost:11434
```

后端服务将在 `http://localhost:10000` 启动。

### 步骤 3：配置前端

#### 3.1 安装 Node.js 依赖并启动前端开发服务器

```bash
cd web
npm install
$env:REACT_APP_API_URL="http://localhost:10000"
npm run start
```

前端将在 `http://localhost:3000` 启动，支持热重载。

**注意**：如果使用 Linux/Mac，环境变量设置方式为：

```bash
REACT_APP_API_URL=http://localhost:10000 npm run start
```

**生产模式（构建后启动）**：

如果你想测试生产构建版本：

```bash
# 1. 构建生产版本
npm run build

# 2. 安装 serve（如果还没有安装）
npm install -g serve

# 3. 启动静态文件服务器
cd build
serve -s . -l 3000

# 或者一行命令（在 web 目录下）
npx serve -s build -l 3000
```

构建后的应用将在 `http://localhost:3000` 启动。

**注意**：
- 开发模式（`npm run start`）：支持热重载，适合开发调试
- 生产模式（`npm run build` + `serve`）：优化后的静态文件，适合测试生产环境或部署

### 步骤 4：访问应用

打开浏览器访问 `http://localhost:3000`，开始游戏！

## 🌐 服务器部署

> 💡 **详细部署指南：** 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的持久化部署方案（systemd、PM2、Docker Compose、Nginx 等）。

### 前置要求

1. 服务器已安装 Node.js、Python
2. 服务器有公网 IP 或域名
3. 已配置防火墙规则（开放端口 10000 和 3000/80）

### 步骤 1：上传代码

```bash
# 使用 git 或 scp 上传代码到服务器
scp -r . user@server:/path/to/manososa
```

### 步骤 2：配置后端

#### 2.1 安装依赖

```bash
cd api
pip install -r requirements.txt
```

#### 2.2 创建 `.env` 文件

在 `api/` 目录下创建 `.env`：

```env
INFERENCE_SERVICE=deepseek
API_KEY=your-deepseek-api-key-here
MODEL=deepseek-chat
MAX_TOKENS=200
```

#### 2.3 使用 systemd 管理服务（推荐）

创建 `/etc/systemd/system/manososa-api.service`：

```ini
[Unit]
Description=manososa API Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/manososa/api
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 10000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable manososa-api
sudo systemctl start manososa-api
sudo systemctl status manososa-api
```

### 步骤 3：配置前端

#### 3.1 安装依赖

```bash
cd web
npm install
```

#### 3.2 修改 API URL

编辑 `web/src/constants.ts`：

```typescript
const SERVER_IP = '47.109.192.144';  // 替换为你的服务器 IP
const SERVER_PORT = 10000;
```

#### 3.3 构建生产版本

```bash
npm run build
```

构建产物在 `web/build/` 目录。

#### 3.4 部署静态文件

**选项 A：使用 Nginx**

1. 安装 Nginx：
```bash
sudo apt install nginx
```

2. 配置 Nginx（`/etc/nginx/sites-available/manososa`）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/manososa/web/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:10000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. 启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/manososa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**选项 B：使用 Node.js 服务器**

使用 `serve` 或 `http-server`：

```bash
npm install -g serve
cd web/build
serve -s . -l 3000
```

### 步骤 4：配置防火墙

```bash
# 开放端口
sudo ufw allow 80/tcp
sudo ufw allow 10000/tcp
sudo ufw reload
```

### 步骤 5：验证部署

1. 访问 `http://your-server-ip` 或 `http://your-domain.com`
2. 检查浏览器控制台是否有错误
3. 测试对话功能是否正常

## ⚙️ 配置说明

### 后端配置（`api/.env`）

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `INFERENCE_SERVICE` | AI 服务提供商 | `deepseek` | `deepseek`, `anthropic`, `openai`, `groq`, `openrouter`, `ollama` |
| `API_KEY` | API 密钥 | - | `sk-xxx...` |
| `MODEL` | 模型名称 | `deepseek-chat` | `deepseek-chat`, `deepseek-reasoner` 等 |
| `MAX_TOKENS` | 最大 token 数 | `200` | `200`, `512`, `1024` |
| `OLLAMA_URL` | Ollama 服务地址 | `http://localhost:11434` | - |

### 前端配置（`web/src/constants.ts`）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SERVER_IP` | 后端服务器 IP | `47.109.192.144` |
| `SERVER_PORT` | 后端服务端口 | `10000` |
| `REACT_APP_API_URL` | API URL（环境变量） | - |


## 📝 如何编写自己的剧本

### 步骤 1：准备角色数据

编辑 `web/src/characters.json`：

1. **修改 `globalStory`**：设置故事背景
2. **修改 `characters` 数组**：
   - 添加/删除角色
   - 设置每个角色的：
     - `name` - 角色名称
     - `bio` - 角色背景
     - `personality` - 性格描述
     - `context1` - 初始证言
     - `context2` - 出示特定证物后的证言
     - `context3` - 出示其他证物后的证言
     - `context4` - 出示其他证物后的证言
     - `lastcontext` - 最终证言
     - `secret` - 角色秘密（AI 会保守的秘密）
     - `image` - 头像文件名（放在 `web/src/assets/character_avatars/`）

### 步骤 2：准备证物数据

编辑 `web/src/evidence.json`：

```json
{
  "id": "01",
  "name": "证物名称",
  "description": "证物描述",
  "image": "01.webp",
  "obtained": false
}
```

### 步骤 3：配置证物-证言映射

编辑 `web/src/context2Mapping.json`：

```json
{
  "角色名称": {
    "证物ID": "context2",  // 出示该证物后切换到 context2
    "02": "context3",      // 出示证物02后切换到 context3
    "03": false            // 出示证物03不改变证言
  }
}
```

### 步骤 4：准备图片资源

1. **角色立绘**：
   - 基础立绘：`character_stand/{name}.png`
   - 变体立绘：`character_stand/{name}_2.png`, `{name}_3.png`, `{name}_4.png`, `{name}_l.png`
   - 转换为 WebP：`npm run convert-images:balanced`

2. **背景图片**：
   - 放在 `assets/bg/` 目录
   - 转换为 AVIF：`npm run convert-images:balanced`

3. **证物图片**：
   - 放在 `assets/evidence/` 目录
   - 命名为 `01.png`, `02.png` 等
   - 转换为 WebP

4. **角色头像**：
   - 放在 `assets/character_avatars/` 目录
   - 命名为 `{name}.jpg` 或 `{name}.png`
   - 转换为 WebP

5. **角色名称图片**：
   - 放在 `assets/character_name/` 目录
   - 命名为 `n_{name}.png`
   - 转换为 WebP

### 步骤 5：配置地图区域（可选）

编辑 `web/src/config/mapRegions.ts`，定义可点击区域：

```typescript
{
  x: 100,
  y: 200,
  width: 150,
  height: 100,
  bgImage: '01.avif',
  evidenceToObtain: '01',  // 可选的证物ID
  action: 'changeBackground'
}
```

### 步骤 6：测试

1. 启动后端和前端
2. 测试对话功能
3. 测试证物出示功能
4. 检查证言是否正确切换
5. 检查立绘是否正确切换

### 提示

- **角色秘密**：在 `secret` 字段中设置角色的秘密，AI 会保守秘密，除非被极端对质
- **证言层次**：使用 `context1` → `context2` → `context3` → `context4` → `lastcontext` 构建证言层次
- **立绘变体**：当角色切换到不同证言时，可以显示不同的立绘变体
- **特殊角色**：如果要创建类似"二阶堂希罗"的自我对话角色，需要在 `api/ai.py` 中添加特殊处理

## ❓ 常见问题

### Q: 如何更换 AI 模型？

A: 修改 `api/.env` 中的 `INFERENCE_SERVICE` 和 `MODEL`：

```env
INFERENCE_SERVICE=deepseek
MODEL=deepseek-chat
API_KEY=sk-xxx...
```

### Q: 本地开发时 API 连接失败？

A: 检查：
1. 后端服务是否在 `http://localhost:10000` 运行
2. `web/src/constants.ts` 中的 `SERVER_IP` 是否为 `localhost`
3. 浏览器控制台是否有 CORS 错误

### Q: 服务器部署后前端无法连接后端？

A: 检查：
1. 后端服务是否正常运行：`sudo systemctl status manososa-api`
2. 防火墙是否开放端口 10000
3. `web/src/constants.ts` 中的 `SERVER_IP` 是否正确
4. 浏览器控制台的网络请求是否成功

### Q: 如何优化图片加载速度？

A: 
1. 使用 `npm run convert-images:balanced` 转换图片
2. 检查 `web/src/utils/imagePreloader.ts` 中的预加载逻辑
3. 使用 CDN 加速（如果可用）

### Q: 如何添加新角色？

A: 
1. 在 `web/src/characters.json` 中添加角色数据
2. 准备角色图片（头像、立绘、名称图片）
3. 在 `web/src/context2Mapping.json` 中配置证物映射
4. 更新 `web/src/config/characterStandPositions.ts` 和 `characterNamePositions.ts`（如果需要）

### Q: 如何修改游戏规则（行动次数等）？

A: 编辑 `web/src/pages/Home.tsx`，查找 `MAX_ACTIONS` 或相关逻辑。

## 📄 许可证

详见 `LICENSE.txt`。

