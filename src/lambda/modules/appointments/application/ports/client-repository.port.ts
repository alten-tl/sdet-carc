import { Client } from '../../domain/client';

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
}
