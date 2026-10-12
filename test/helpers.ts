import { cpSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

interface ProjectOptions {
  /** Dependências do package.json do projeto; `null` cria um projeto sem package.json. */
  dependencies?: Record<string, string> | null;
  /** Versão do bth-ui a instalar em node_modules. */
  bthUi?: string;
  /** Copia a documentação do fixture `bth-ui-<docs>` para dentro do pacote instalado. */
  docs?: string;
}

/** Cria um projeto de front-end falso em um diretório temporário e devolve o caminho dele. */
export function createProject({ dependencies = {}, bthUi, docs }: ProjectOptions = {}): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'bth-ui-mcp-')));

  if (dependencies) {
    writeJson(join(root, 'package.json'), { name: 'app', dependencies });
  }

  if (bthUi) {
    const packageDir = join(root, 'node_modules', 'bth-ui');
    writeJson(join(packageDir, 'package.json'), { name: 'bth-ui', version: bthUi });
    if (docs) {
      cpSync(join(fixturesDir, `bth-ui-${docs}`), join(packageDir, 'docs'), { recursive: true });
    }
  }

  return root;
}
