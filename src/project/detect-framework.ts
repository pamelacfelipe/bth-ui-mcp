// Angular ou AngularJS (package.json)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework } from '../schema.js';

export interface DetectedFramework {
  framework: Framework;
  /** Versão declarada no package.json do projeto, como `^18.2.0`. */
  version: string;
}

/**
 * Detecta o framework pelas dependências do projeto: `@angular/core` indica
 * Angular e `angular` indica AngularJS. Devolve `null` quando não dá para
 * saber, e então quem chama precisa perguntar ao usuário.
 */
export function detectFramework(projectRoot: string): DetectedFramework | null {
  let dependencies: Record<string, unknown>;

  try {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    dependencies = { ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.dependencies };
  } catch {
    return null;
  }

  const candidates: [string, Framework][] = [
    ['@angular/core', 'angular'],
    ['angular', 'angularjs'],
  ];

  for (const [name, framework] of candidates) {
    const version = dependencies[name];
    if (typeof version === 'string') return { framework, version };
  }

  return null;
}
