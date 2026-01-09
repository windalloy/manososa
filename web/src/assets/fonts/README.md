# 字体文件说明

## 需要的字体文件

为了加快字体加载速度，请将思源宋体（Noto Serif SC）字体文件放在此目录下。

### 字体文件名

- `NotoSerifSC-Regular.woff2` (推荐，最小最快)

### 下载方式

#### 方式1：使用提供的脚本

**Windows (PowerShell):**
```powershell
.\download-font.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x download-font.sh
./download-font.sh
```

#### 方式2：手动下载

1. 访问 Google Fonts 获取字体文件：
   - 访问：https://fonts.google.com/noto/specimen/Noto+Serif+SC
   - 点击 "Download family" 下载字体包
   - 解压后找到 `NotoSerifSC-Regular.woff2` 文件

2. 或者直接下载 woff2 文件：
   ```
   https://fonts.gstatic.com/s/notoserifsc/v23/H4c8BXePl9DZ0Xe7gG9cyTj3p4s5hUeq8SY9GqKX1RMvMcJg.woff2
   ```

3. 将下载的文件重命名为 `NotoSerifSC-Regular.woff2` 并放在此目录下

### 支持的格式

如果 woff2 格式不可用，也可以使用以下格式（按优先级排序）：
- `NotoSerifSC-Regular.woff2` (推荐)
- `NotoSerifSC-Regular.woff`
- `NotoSerifSC-Regular.ttf`
- `NotoSerifSC-Regular.otf`

### 注意事项

- 如果本地字体文件不存在，系统会自动从 Google Fonts 加载字体
- 本地字体文件可以显著提高加载速度
- 思源宋体是开源字体，可以免费使用

