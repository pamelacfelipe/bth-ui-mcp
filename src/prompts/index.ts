import type { BthUiServer } from '../server.js';
import { registerInstalarLib } from './instalar-lib.js';
import { registerMigrarParaLib } from './migrar-para-lib.js';
import { registerRevisarUso } from './revisar-uso.js';

export function registerPrompts(server: BthUiServer) {
  registerInstalarLib(server);
  registerMigrarParaLib(server);
  registerRevisarUso(server);
}
