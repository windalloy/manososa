
const SERVER_IP = '47.109.192.144';
const SERVER_PORT = 10000;

function getApiUrl(): string {
  
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  
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
