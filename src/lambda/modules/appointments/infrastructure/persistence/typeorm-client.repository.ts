import { DataSource } from 'typeorm';
import { ClientRepository } from '../../application/ports/client-repository.port';
import { Client } from '../../domain/client';
import { ClientRecord } from './records/client-record';

export class TypeOrmClientRepository implements ClientRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Client | null> {
    const row = await this.dataSource
      .getRepository(ClientRecord)
      .findOne({ where: { id } });

    if (!row) {
      return null;
    }

    return new Client({
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      address: row.address,
    });
  }
}
