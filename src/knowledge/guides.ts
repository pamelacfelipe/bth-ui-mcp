// guias de instalação e configuração (content/guides)
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DetectedFramework } from '../project/detect-framework.js';
import { frameworks, type Framework } from '../schema.js';

export type GuideKind = 'install' | 'setup';

export const frameworkNames: Record<Framework, string> = { angular: 'Angular', angularjs: 'AngularJS' };

/** Tópicos de `get_setup_guide` e o título da seção correspondente nos guias de configuração. */
export const setupTopics = {
  registro: 'Registro dos componentes',
  estilos: 'Estilos',
  fonte: 'Fontes',
  tokens: 'Tokens',
  eventos: 'Props e eventos',
  formularios: 'Formulários',
} as const;

export type SetupTopic = keyof typeof setupTopics;

// A pasta content fica na raiz do pacote: um nível acima de dist/bin.js e dois acima de src/knowledge
const here = dirname(fileURLToPath(import.meta.url));
const contentDir = [join(here, '..', 'content'), join(here, '..', '..', 'content')].find(existsSync);

const cache = new Map<string, string>();

export function readGuide(kind: GuideKind, framework: Framework): string {
  const name = `${kind}-${framework}.md`;
  let guide = cache.get(name);

  if (guide === undefined) {
    if (!contentDir) throw new Error('Pasta content não encontrada no pacote do bth-ui-mcp');
    guide = readFileSync(join(contentDir, 'guides', name), 'utf8').trim();
    cache.set(name, guide);
  }

  return guide;
}

/** Uma seção (`## Título`) do guia de configuração, até a próxima seção. */
export function readSetupTopic(framework: Framework, topic: SetupTopic): string {
  const sections = readGuide('setup', framework).split(/^(?=## )/m);
  const section = sections.find(candidate => candidate.startsWith(`## ${setupTopics[topic]}\n`));

  if (!section) throw new Error(`Seção "${setupTopics[topic]}" não encontrada no guia setup-${framework}.md`);
  return section.trim();
}

export type FrameworkChoice =
  | { ok: true; framework: Framework; detected: boolean }
  | { ok: false; isError: boolean; message: string };

/**
 * Decide o framework de um guia: o que foi pedido, senão o detectado no
 * projeto. Quando não dá para saber, devolve a pergunta a fazer ao usuário.
 */
export function chooseFramework(requested: string | undefined, detected: DetectedFramework | null): FrameworkChoice {
  const accepted = frameworks.map(name => `\`${name}\``).join(' ou ');

  if (requested) {
    const framework = frameworks.find(name => name === requested.trim().toLowerCase());
    return framework
      ? { ok: true, framework, detected: false }
      : {
          ok: false,
          isError: true,
          message: `Framework "${requested}" não é aceito. Valores aceitos: ${accepted}. Chame a tool de novo com um deles.`,
        };
  }

  if (detected) return { ok: true, framework: detected.framework, detected: true };

  return {
    ok: false,
    isError: false,
    message:
      `Não foi possível detectar o framework pelo \`package.json\` do projeto. ` +
      `Pergunte ao usuário se o projeto é Angular ou AngularJS e chame a tool de novo com \`framework\` igual a ${accepted}.`,
  };
}
