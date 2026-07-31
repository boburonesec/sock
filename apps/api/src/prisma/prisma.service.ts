import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { createPrismaAdapter } from './client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: createPrismaAdapter(),
    });
  }

  /**
   * Connection is intentionally lazy. The API foundation can still expose its
   * non-database health endpoint before a PostgreSQL environment is provisioned.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
