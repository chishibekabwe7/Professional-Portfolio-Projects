import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { createServer, Server as NetServer, Socket } from 'net';
import { LocationGateway } from '../location/location.gateway';
import { LocationService } from '../location/location.service';
import { Gt06Parser } from './gt06.parser';

@Injectable()
export class TcpGpsServer {
  private readonly logger = new Logger(TcpGpsServer.name);
  private readonly socketImeiMap = new Map<Socket, string>();
  private server: NetServer | null = null;

  constructor(
    private readonly locationGateway: LocationGateway,
    @Inject(forwardRef(() => LocationService))
    private readonly locationService: LocationService,
  ) {}

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

  sendCutEngine(imei: string): boolean {
    const socket = this.findSocketByImei(imei);

    if (!socket || !socket.writable) {
      return false;
    }

    const packet = this.buildRelayControlPacket(0x79, 0x79);
    socket.write(packet);
    this.logger.log(`ENGINE CUT command sent to IMEI: ${imei}`);
    return true;
  }

  sendRestoreEngine(imei: string): boolean {
    const socket = this.findSocketByImei(imei);

    if (!socket || !socket.writable) {
      return false;
    }

    const packet = this.buildRelayControlPacket(0x79, 0x78);
    socket.write(packet);
    this.logger.log(`ENGINE RESTORE command sent to IMEI: ${imei}`);
    return true;
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
      this.locationGateway.broadcast(imei, data);
      void this.locationService.handleDeviceUpdate(imei, data).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to handle device update for IMEI ${imei}: ${message}`);
      });
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

  private findSocketByImei(imei: string): Socket | null {
    for (const [socket, mappedImei] of this.socketImeiMap.entries()) {
      if (mappedImei === imei) {
        return socket;
      }
    }

    return null;
  }

  private buildRelayControlPacket(relayByte1: number, relayByte2: number): Buffer {
    const protocolNumber = 0x80;
    const commandHeader = Buffer.from([0x00, 0x01]);

    // NOTE: ST-901AL relay-control payload bytes after 0x79 0x79 / 0x79 0x78
    // are GT06-vendor specific and should be verified against your exact manual.
    const relayPayload = Buffer.from([
      relayByte1,
      relayByte2,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]);

    const commandData = Buffer.concat([commandHeader, relayPayload]);
    const packetLength = 1 + commandData.length + 2;

    const crcInput = Buffer.concat([
      Buffer.from([packetLength, protocolNumber]),
      commandData,
    ]);
    const crc = this.crc16X25(crcInput);

    return Buffer.from([
      0x78,
      0x78,
      packetLength,
      protocolNumber,
      ...commandData,
      (crc >> 8) & 0xff,
      crc & 0xff,
      0x0d,
      0x0a,
    ]);
  }

  private crc16X25(data: Buffer): number {
    let crc = 0xffff;

    for (const byte of data) {
      crc ^= byte;

      for (let i = 0; i < 8; i += 1) {
        const lsbSet = (crc & 0x0001) !== 0;
        crc >>= 1;

        if (lsbSet) {
          crc ^= 0x8408;
        }
      }
    }

    crc ^= 0xffff;
    return crc & 0xffff;
  }
}