// 自动检测 API URL（不需要 web/.env 文件）
// 1. 优先使用环境变量 REACT_APP_API_URL
// 2. 如果在浏览器中运行且不是 localhost，自动使用当前服务器的域名和端口 10000
// 3. 开发环境：如果浏览器访问的是 localhost，但实际在服务器上运行，使用服务器 IP
// 4. 生产环境：使用服务器 IP
// 注意：可以通过命令行临时设置 REACT_APP_API_URL 环境变量（可选）

// 服务器 IP 地址（用于服务器环境）
const SERVER_IP = '47.109.192.144';
const SERVER_PORT = 10000;

function getApiUrl(): string {
  // 优先使用环境变量
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 在浏览器环境中自动检测
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 如果不是本地开发环境，使用当前服务器的域名和端口 10000
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:${SERVER_PORT}`;
    }
    
    // 如果浏览器访问的是 localhost，但可能是在服务器上运行
    // 检查是否可以通过服务器 IP 访问（通过尝试连接判断）
    // 为了简化，在开发环境也使用服务器 IP（如果后端在服务器上）
    // 这里假设：如果是在服务器上运行开发服务器，后端也在同一服务器
    if (process.env.NODE_ENV !== 'production') {
      // 开发环境：如果访问 localhost，但实际在服务器上，使用服务器 IP
      // 可以通过检查 window.location.port 或其他方式判断
      // 为了保险，开发环境也默认使用服务器 IP（如果后端在服务器上）
      return `http://${SERVER_IP}:${SERVER_PORT}`;
    }
  }
  
  // 生产环境默认使用服务器 IP
  if (process.env.NODE_ENV === 'production') {
    return `http://${SERVER_IP}:${SERVER_PORT}`;
  }
  
  // 本地开发环境（如果后端也在本地）
  return `http://localhost:${SERVER_PORT}`;
}

export const API_URL = getApiUrl();
