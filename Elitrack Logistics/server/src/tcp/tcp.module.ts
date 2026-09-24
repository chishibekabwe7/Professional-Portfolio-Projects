import { Module, forwardRef } from '@nestjs/common';
import { LocationModule } from '../location/location.module';
import { TcpGpsServer } from './tcp.server';

@Module({
  imports: [forwardRef(() => LocationModule)],
  providers: [TcpGpsServer],
  exports: [TcpGpsServer],
})
export class TcpModule {}