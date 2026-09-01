import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService){
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) throw new Error('La variable DATABASE_URL est requise.');
    const pool = new Pool({ connectionString });

    const adapter = new PrismaPg(pool);
    super({ adapter })
  }
}
