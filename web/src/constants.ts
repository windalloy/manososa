
// 服务器 IP 配置（仅作为开发环境的回退选项）
// 注意：生产环境会自动使用当前访问的域名，不需要硬编码 IP
const SERVER_IP = '42.193.22.131';  // 更新为新的服务器 IP
const SERVER_PORT = 10000;

function getApiUrl(): string {
  // 优先级 1: 环境变量（最高优先级）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 优先级 2: 根据当前访问的域名自动判断
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // 如果不是本地开发环境，使用当前服务器的域名和端口 10000
    // 这样可以自动适配服务器 IP 变化，无需修改代码
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:${SERVER_PORT}`;
    }
    
    // 如果是本地开发环境（localhost），但有指定服务器 IP 的需求
    // 仅在开发环境使用硬编码的 SERVER_IP 作为回退
    if (process.env.NODE_ENV !== 'production') {
      // 开发环境：如果访问 localhost，但后端在服务器上，可以使用服务器 IP
      // 如果后端也在本地，则使用 localhost
      // 可以通过环境变量 REACT_APP_API_URL 来覆盖此行为
      return `http://${SERVER_IP}:${SERVER_PORT}`;
    }
  }
  
  // 优先级 3: 生产环境回退（应该不会到达这里，因为上面已经处理了非 localhost 的情况）
  // 保留此逻辑以防万一
  if (process.env.NODE_ENV === 'production') {
    // 生产环境应该通过 window.location.hostname 自动判断
    // 这里只作为最后的回退
    return `http://${SERVER_IP}:${SERVER_PORT}`;
  }
  
  // 优先级 4: 本地开发环境（后端在本地）
  return `http://localhost:${SERVER_PORT}`;
}

export const API_URL = getApiUrl();
