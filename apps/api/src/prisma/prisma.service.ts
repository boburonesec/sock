import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /**
   * Connection is intentionally lazy. The API foundation can still expose its
   * non-database health endpoint before a PostgreSQL environment is provisioned.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
