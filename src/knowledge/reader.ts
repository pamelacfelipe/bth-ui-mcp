// lê e valida os JSON (cache por mtime)
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { BthUiInstall } from '../project/state.js';
import { docsJsonSchema, tokensJsonSchema, type Component, type Token } from '../schema.js';
import { logger } from '../util/logger.js';
import { normalizeComponent } from './normalize.js';

export interface Knowledge {
  bthUi: BthUiInstall;
  /** Versão do compilador do Stencil que gerou o `docs.json`. */
  stencilVersion: string | null;
  components: Component[];
  /** `null` quando o pacote não traz `docs/tokens.json`. */
  tokens: Token[] | null;
}

/** Erro de leitura da documentação, com mensagem pronta para ser devolvida ao agente. */
export class KnowledgeError extends Error {}

interface CacheEntry<T> {
  mtimeMs: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Lê e valida um JSON, reaproveitando o resultado enquanto o arquivo não mudar. Devolve `null` se ele não existir. */
function readCached<T>(path: string, parse: (raw: unknown) => T): T | null {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) {
    cache.delete(path);
    return null;
  }

  const cached = cache.get(path);
  if (cached?.mtimeMs === stat.mtimeMs) return cached.value as T;

  logger.debug(`lendo ${path}`);
  const value = parse(JSON.parse(readFileSync(path, 'utf8')));
  cache.set(path, { mtimeMs: stat.mtimeMs, value });
  return value;
}

function describeIssues(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issues = error.issues.slice(0, 5).map(issue => `\`${issue.path.join('.') || '(raiz)'}\`: ${issue.message}`);
    const more = error.issues.length > 5 ? ` (e mais ${error.issues.length - 5})` : '';
    return issues.join('; ') + more;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Versão do Stencil lida sem validação, para citar na mensagem quando o resto do arquivo é inválido. */
function peekStencilVersion(path: string): string {
  try {
    const version = JSON.parse(readFileSync(path, 'utf8'))?.compiler?.version;
    return typeof version === 'string' ? version : 'desconhecida';
  } catch {
    return 'desconhecida';
  }
}

/**
 * Lê a documentação publicada dentro do bth-ui instalado. Só deve ser chamada
 * no estado `ready`, em que o `docs/docs.json` existe.
 */
export function readKnowledge(bthUi: BthUiInstall): Knowledge {
  const docsPath = join(bthUi.dir, 'docs', 'docs.json');
  const tokensPath = join(bthUi.dir, 'docs', 'tokens.json');

  let docs;
  try {
    docs = readCached(docsPath, raw => {
      const parsed = docsJsonSchema.parse(raw);
      return {
        stencilVersion: parsed.compiler?.version ?? null,
        components: parsed.components.map(normalizeComponent),
      };
    });
  } catch (error) {
    throw new KnowledgeError(
      `O \`docs/docs.json\` do bth-ui@${bthUi.version} (Stencil ${peekStencilVersion(docsPath)}) não tem o formato esperado ` +
        `por esta versão do bth-ui-mcp: ${describeIssues(error)}. Arquivo: \`${docsPath}\`. ` +
        `Atualize o bth-ui-mcp ou confira a matriz de compatibilidade no README.`,
    );
  }

  if (!docs) {
    throw new KnowledgeError(`O bth-ui@${bthUi.version} não traz \`docs/docs.json\` (\`${docsPath}\`).`);
  }

  let tokens: Token[] | null;
  try {
    tokens = readCached(tokensPath, raw => tokensJsonSchema.parse(raw).tokens);
  } catch (error) {
    throw new KnowledgeError(
      `O \`docs/tokens.json\` do bth-ui@${bthUi.version} não tem o formato esperado por esta versão do bth-ui-mcp: ` +
        `${describeIssues(error)}. Arquivo: \`${tokensPath}\`.`,
    );
  }

  return { bthUi, ...docs, tokens };
}
