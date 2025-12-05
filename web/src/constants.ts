// 自动检测 API URL（不需要 web/.env 文件）
// 1. 如果在浏览器中运行且不是 localhost，自动使用当前服务器的域名和端口 10000
// 2. 否则使用 localhost:10000（本地开发环境）
// 注意：可以通过命令行临时设置 REACT_APP_API_URL 环境变量（可选）
function getApiUrl(): string {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:10000`;
    }
  }
  
  return 'http://localhost:10000';
}

export const API_URL = getApiUrl();
