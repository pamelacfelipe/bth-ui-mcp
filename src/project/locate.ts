// raiz do projeto e node_modules/bth-ui
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Diretórios de `start` até a raiz do sistema de arquivos, do mais próximo ao mais distante. */
function* ancestors(start: string): Generator<string> {
  let dir = resolve(start);
  while (true) {
    yield dir;
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

/**
 * Procura `node_modules/bth-ui` subindo os diretórios, o que cobre workspaces
 * e dependências elevadas. Devolve a instalação mais próxima de `start`.
 */
export function findBthUi(start: string): string | null {
  for (const dir of ancestors(start)) {
    const candidate = join(dir, 'node_modules', 'bth-ui');
    if (existsSync(join(candidate, 'package.json'))) return candidate;
  }
  return null;
}

/** Diretório do `package.json` mais próximo de `start`, que é a raiz do projeto. */
export function findProjectRoot(start: string): string | null {
  for (const dir of ancestors(start)) {
    if (existsSync(join(dir, 'package.json'))) return dir;
  }
  return null;
}
