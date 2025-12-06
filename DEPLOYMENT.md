# manososa 持久化部署指南

本文档提供前后端的持久化部署方案，确保服务在服务器重启后自动启动。

## 📋 目录

- [方案一：systemd（推荐）](#方案一systemd推荐)
- [方案二：PM2](#方案二pm2)
- [方案三：Docker Compose](#方案三docker-compose)
- [方案四：Nginx + systemd](#方案四nginx--systemd)

---

## 方案一：systemd（推荐）

### 后端部署

#### 1. 准备环境

```bash
# 进入项目目录
cd /path/to/manososa/api

# 安装 Python 依赖
pip install -r requirements.txt

# 或使用虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. 创建 `.env` 文件

```bash
cd /path/to/manososa/api
nano .env
```

内容：
```env
INFERENCE_SERVICE=deepseek
API_KEY=your-deepseek-api-key-here
MODEL=deepseek-chat
MAX_TOKENS=200
```

#### 3. 创建 systemd 服务文件

```bash
sudo nano /etc/systemd/system/manososa-api.service
```

内容（使用虚拟环境）：
```ini
[Unit]
Description=manososa API Service
After=network.target

[Service]
Type=simple
User=your-username
Group=your-group
WorkingDirectory=/path/to/manososa/api
Environment="PATH=/path/to/manososa/api/venv/bin:/usr/bin:/usr/local/bin"
ExecStart=/path/to/manososa/api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 10000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

内容（不使用虚拟环境）：
```ini
[Unit]
Description=manososa API Service
After=network.target

[Service]
Type=simple
User=your-username
Group=your-group
WorkingDirectory=/path/to/manososa/api
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 10000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 4. 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start manososa-api

# 设置开机自启
sudo systemctl enable manososa-api

# 查看状态
sudo systemctl status manososa-api

# 查看日志
sudo journalctl -u manososa-api -f
```

#### 5. 常用命令

```bash
# 停止服务
sudo systemctl stop manososa-api

# 重启服务
sudo systemctl restart manososa-api

# 查看日志
sudo journalctl -u manososa-api -n 100

# 查看实时日志
sudo journalctl -u manososa-api -f
```

### 前端部署

#### 1. 构建生产版本

```bash
cd /path/to/manososa/web
npm install
npm run build
```

#### 2. 安装 serve

```bash
npm install -g serve
```

#### 3. 创建 systemd 服务文件

```bash
sudo nano /etc/systemd/system/manososa-web.service
```

内容：
```ini
[Unit]
Description=manososa Web Service
After=network.target

[Service]
Type=simple
User=your-username
Group=your-group
WorkingDirectory=/path/to/manososa/web
ExecStart=/usr/bin/npx serve -s build -l 3000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 4. 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start manososa-web

# 设置开机自启
sudo systemctl enable manososa-web

# 查看状态
sudo systemctl status manososa-web
```

---

## 方案二：PM2

### 后端部署

#### 1. 安装 PM2

```bash
npm install -g pm2
```

#### 2. 创建 PM2 配置文件

```bash
cd /path/to/manososa/api
nano ecosystem.config.js
```

内容（使用虚拟环境）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-api',
    script: '/path/to/manososa/api/venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 10000',
    cwd: '/path/to/manososa/api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

或者使用 `python -m uvicorn`（推荐）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-api',
    script: 'python',
    args: '-m uvicorn main:app --host 0.0.0.0 --port 10000',
    interpreter: '/path/to/manososa/api/venv/bin/python',
    cwd: '/path/to/manososa/api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

或者使用系统 Python（如果没有虚拟环境）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-api',
    script: 'python3',
    args: '-m uvicorn main:app --host 0.0.0.0 --port 10000',
    cwd: '/path/to/manososa/api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

#### 3. 启动服务

```bash
# 启动
pm2 start ecosystem.config.js

# 保存配置（开机自启）
pm2 save
pm2 startup

# 查看状态
pm2 status

# 查看日志
pm2 logs manososa-api
```

### 前端部署

#### 1. 构建生产版本

```bash
cd /path/to/manososa/web
npm install
npm run build
```

#### 2. 创建 PM2 配置文件

```bash
cd /path/to/manososa/web
nano ecosystem.config.js
```

内容（方案 1：使用 npx，推荐）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-web',
    script: 'npx',
    args: 'serve -s build -l 3000',
    cwd: '/path/to/manososa/web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

内容（方案 2：使用 serve 完整路径）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-web',
    script: '/usr/bin/serve',  // 或 which serve 找到的路径
    args: '-s build -l 0.0.0.0:3000',
    cwd: '/path/to/manososa/web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

内容（方案 3：使用 node_modules 中的 serve）：
```javascript
module.exports = {
  apps: [{
    name: 'manososa-web',
    script: 'node_modules/.bin/serve',
    args: '-s build -l 0.0.0.0:3000',
    cwd: '/path/to/manososa/web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

#### 3. 启动服务

```bash
# 启动
pm2 start ecosystem.config.js

# 保存配置（开机自启）
pm2 save
pm2 startup

# 查看状态
pm2 status
```

---

## 方案三：Docker Compose

### 1. 创建 docker-compose.yml

在项目根目录创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: manososa-api
    ports:
      - "10000:10000"
    env_file:
      - ./api/.env
    restart: always
    volumes:
      - ./api:/app
    networks:
      - manososa-network

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    container_name: manososa-web
    ports:
      - "3000:3000"
    depends_on:
      - api
    restart: always
    volumes:
      - ./web:/app
      - /app/node_modules
    networks:
      - manososa-network

networks:
  manososa-network:
    driver: bridge
```

### 2. 修改 Dockerfile

**api/Dockerfile**（如果使用 requirements.txt）：
```dockerfile
FROM python:3.12.2-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
```

**web/Dockerfile**（生产环境）：
```dockerfile
FROM node:20.15.1 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20.15.1

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
```

### 3. 启动服务

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 4. 设置开机自启

Docker Compose 服务默认会在 Docker 启动时自动启动。确保 Docker 服务开机自启：

```bash
sudo systemctl enable docker
```

---

## 方案四：Nginx + systemd

### 后端部署

使用方案一中的 systemd 配置。

### 前端部署（使用 Nginx）

#### 1. 构建生产版本

```bash
cd /path/to/manososa/web
npm install
npm run build
```

#### 2. 安装 Nginx

```bash
# Alibaba Cloud Linux / CentOS
sudo yum install nginx -y

# Ubuntu / Debian
sudo apt install nginx -y
```

#### 3. 配置 Nginx

```bash
sudo nano /etc/nginx/conf.d/manososa.conf
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或你的服务器 IP

    root /path/to/manososa/web/build;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:10000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 4. 启动 Nginx

```bash
# 测试配置
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 🔧 配置防火墙

### Alibaba Cloud Linux / CentOS

```bash
# 使用 firewalld
sudo firewall-cmd --permanent --add-port=10000/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 10000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
```

### Ubuntu / Debian

```bash
sudo ufw allow 10000/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw reload
```

---

## 🔍 故障排查

### 检查服务状态

```bash
# systemd
sudo systemctl status manososa-api
sudo systemctl status manososa-web

# PM2
pm2 status
pm2 logs

# Docker
docker-compose ps
docker-compose logs
```

### 检查端口占用

```bash
# 检查端口是否被占用
sudo netstat -tlnp | grep 10000
sudo netstat -tlnp | grep 3000

# 或使用 ss
ss -tlnp | grep 10000
ss -tlnp | grep 3000
```

### 查看日志

```bash
# systemd
sudo journalctl -u manososa-api -n 100
sudo journalctl -u manososa-web -n 100

# PM2
pm2 logs manososa-api
pm2 logs manososa-web

# Docker
docker-compose logs api
docker-compose logs web
```

---

## 📝 推荐方案

- **生产环境**：方案四（Nginx + systemd）
  - 性能好
  - 支持 HTTPS
  - 易于配置反向代理

- **开发/测试环境**：方案一（systemd）
  - 简单直接
  - 易于调试

- **容器化部署**：方案三（Docker Compose）
  - 环境隔离
  - 易于扩展

---

## 🔐 安全建议

1. **使用 HTTPS**：配置 SSL 证书（Let's Encrypt）
2. **限制访问**：使用防火墙限制 API 端口访问
3. **环境变量**：不要将 `.env` 文件提交到 Git
4. **定期更新**：保持系统和依赖包更新

---

## 📚 相关文档

- [systemd 官方文档](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [Nginx 官方文档](https://nginx.org/en/docs/)

