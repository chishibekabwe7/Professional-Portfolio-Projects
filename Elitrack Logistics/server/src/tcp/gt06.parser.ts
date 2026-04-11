export type Gt06LocationData = {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: Date;
};

export class Gt06Parser {
  private static readonly START_BYTE_1 = 0x78;
  private static readonly START_BYTE_2 = 0x78;
  private static readonly MIN_PACKET_LENGTH = 5;

  static parseLoginPacket(buf: Buffer): { imei: string } {
    if (buf.length < 12) {
      throw new Error('Invalid GT06 login packet length.');
    }

    const imei = buf.subarray(4, 12).toString('hex');
    return { imei };
  }

  static parseLocationPacket(buf: Buffer): Gt06LocationData {
    if (buf.length < 20) {
      throw new Error('Invalid GT06 location packet length.');
    }

    const yy = buf.readUInt8(4);
    const mm = buf.readUInt8(5);
    const dd = buf.readUInt8(6);
    const hh = buf.readUInt8(7);
    const min = buf.readUInt8(8);
    const ss = buf.readUInt8(9);

    const timestamp = new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, min, ss));

    return {
      latitude: buf.readUInt32BE(11) / 1800000.0,
      longitude: buf.readUInt32BE(15) / 1800000.0,
      speed: buf.readUInt8(19),
      timestamp,
    };
  }

  static buildAck(packetType: number): Buffer {
    if (packetType !== 0x01 && packetType !== 0x13) {
      throw new Error('GT06 ACK is only supported for login (0x01) and heartbeat (0x13).');
    }

    const length = 0x05;
    const serialHigh = 0x00;
    const serialLow = 0x01;
    const crc = this.crc16X25(Buffer.from([length, packetType, serialHigh, serialLow]));
    const crcHigh = (crc >> 8) & 0xff;
    const crcLow = crc & 0xff;

    return Buffer.from([
      this.START_BYTE_1,
      this.START_BYTE_2,
      length,
      packetType,
      serialHigh,
      serialLow,
      crcHigh,
      crcLow,
      0x0d,
      0x0a,
    ]);
  }

  static isValidPacket(buf: Buffer): boolean {
    if (!Buffer.isBuffer(buf) || buf.length < this.MIN_PACKET_LENGTH) {
      return false;
    }

    return buf[0] === this.START_BYTE_1 && buf[1] === this.START_BYTE_2;
  }

  private static crc16X25(data: Buffer): number {
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