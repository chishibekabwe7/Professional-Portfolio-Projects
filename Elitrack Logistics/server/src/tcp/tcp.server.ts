import { Injectable, Logger } from '@nestjs/common';
import { Socket, createServer, Server as NetServer } from 'net';
import { Gt06LocationData, Gt06Parser } from './gt06.parser';

@Injectable()
export class LocationGateway {
  handleDeviceUpdate(_imei: string, _data: Gt06LocationData): void {
    // Intentionally no-op until websocket/location broadcasting is wired.
  }
}

@Injectable()
export class TcpGpsServer {
  private readonly logger = new Logger(TcpGpsServer.name);
  private readonly socketImeiMap = new Map<Socket, string>();
  private server: NetServer | null = null;

  constructor(private readonly locationGateway: LocationGateway) {}

  start(port = 5000): void {
    if (this.server) {
      return;
    }

    this.server = createServer((socket) => {
      this.handleConnection(socket);
    });

    this.server.on('error', (error) => {
      this.logger.error(`TCP server error: ${error.message}`);
    });

    this.server.listen(port, () => {
      this.logger.log(`GT06 TCP server listening on port ${port}`);
    });
  }

  private handleConnection(socket: Socket): void {
    this.logger.log(
      `TCP client connected: ${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 'unknown'}`,
    );

    socket.on('data', (buf: Buffer) => {
      this.handlePacket(socket, buf);
    });

    socket.on('close', () => {
      const imei = this.socketImeiMap.get(socket);
      this.socketImeiMap.delete(socket);
      this.logger.log(`TCP client disconnected${imei ? ` (IMEI: ${imei})` : ''}`);
    });

    socket.on('error', (error) => {
      const imei = this.socketImeiMap.get(socket);
      this.socketImeiMap.delete(socket);
      this.logger.warn(`TCP client disconnect on error${imei ? ` (IMEI: ${imei})` : ''}: ${error.message}`);
    });
  }

  private handlePacket(socket: Socket, buf: Buffer): void {
    if (!Gt06Parser.isValidPacket(buf)) {
      return;
    }

    const packetType = buf.readUInt8(3);

    if (packetType === 0x01) {
      const { imei: rawImei } = Gt06Parser.parseLoginPacket(buf);
      const imei = this.normalizeImei(rawImei);
      this.socketImeiMap.set(socket, imei);
      socket.write(Gt06Parser.buildAck(0x01));

      if (imei === '9170129590') {
        this.logger.log('ST-901AL connected');
      }

      return;
    }

    if (packetType === 0x12) {
      const imei = this.socketImeiMap.get(socket);
      if (!imei) {
        this.logger.warn('Received location packet before login packet; packet ignored.');
        return;
      }

      const data = Gt06Parser.parseLocationPacket(buf);
      this.locationGateway.handleDeviceUpdate(imei, data);
      return;
    }

    if (packetType === 0x13) {
      socket.write(Gt06Parser.buildAck(0x13));
    }
  }

  private normalizeImei(rawImei: string): string {
    const normalized = rawImei.replace(/^0+/, '');
    return normalized.length > 0 ? normalized : rawImei;
  }
}