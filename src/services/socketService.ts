import { io, Socket } from 'socket.io-client';
const SOCKET_URL = 'https://api.greencityamc.com';

class SocketService {
  private socket: Socket | null = null;
  private currentTenantId: string | null = null;
  private vehicleListeners: ((data: any) => void)[] = [];

  public connect(token: string, tenantId: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.currentTenantId = tenantId;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to backend');
      if (this.currentTenantId) {
        this.socket?.emit('join', { tenantId: this.currentTenantId });
        console.log(`[SocketService] Joined room for tenant: ${this.currentTenantId}`);
      }
    });

    this.socket.on('vehicle:update', (data: any) => {
      this.vehicleListeners.forEach(listener => listener(data));
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[SocketService] Disconnected. Reason: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message);
    });
  }

  public subscribeToVehicles(callback: (data: any) => void) {
    this.vehicleListeners.push(callback);
    return () => {
      this.vehicleListeners = this.vehicleListeners.filter(l => l !== callback);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.vehicleListeners = [];
    this.currentTenantId = null;
  }
}

export const socketService = new SocketService();
