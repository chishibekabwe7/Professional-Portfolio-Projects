import { Module } from '@nestjs/common';
import { LocationGateway, TcpGpsServer } from './tcp.server';

@Module({
  providers: [TcpGpsServer, LocationGateway],
  exports: [TcpGpsServer],
})
export class TcpModule {}