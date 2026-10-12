// pronto, sem documentação, não instalado
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectFramework, type DetectedFramework } from './detect-framework.js';
import { findBthUi, findProjectRoot } from './locate.js';

/** Primeira versão do bth-ui que publica `docs/docs.json` e `docs/tokens.json`. */
export const MIN_BTH_UI_VERSION = '0.0.2';

export interface BthUiInstall {
  /** Caminho de `node_modules/bth-ui`. */
  dir: string;
  version: string;
}

interface BaseState {
  /** Diretório a partir do qual o MCP procurou. */
  searchedFrom: string;
  projectRoot: string | null;
  framework: DetectedFramework | null;
}

export type ProjectState =
  | (BaseState & { status: 'ready'; bthUi: BthUiInstall })
  | (BaseState & { status: 'no-docs'; bthUi: BthUiInstall })
  | (BaseState & { status: 'not-installed'; projectRoot: string })
  | (BaseState & { status: 'unknown-project'; projectRoot: null });

function readVersion(bthUiDir: string): string {
  try {
    const { version } = JSON.parse(readFileSync(join(bthUiDir, 'package.json'), 'utf8'));
    return typeof version === 'string' ? version : 'desconhecida';
  } catch {
    return 'desconhecida';
  }
}

/** Estado do projeto visto a partir de um diretório. Nada é guardado em cache: instalar a lib muda a resposta na hora. */
export function getProjectState(searchedFrom: string): ProjectState {
  const projectRoot = findProjectRoot(searchedFrom);
  const base = { searchedFrom, projectRoot, framework: projectRoot ? detectFramework(projectRoot) : null };

  const bthUiDir = findBthUi(searchedFrom);

  if (bthUiDir) {
    const bthUi = { dir: bthUiDir, version: readVersion(bthUiDir) };
    const status = existsSync(join(bthUiDir, 'docs', 'docs.json')) ? 'ready' : 'no-docs';
    return { ...base, status, bthUi };
  }

  return projectRoot
    ? { ...base, status: 'not-installed', projectRoot }
    : { ...base, status: 'unknown-project', projectRoot: null };
}

/**
 * Escolhe o estado entre vários diretórios candidatos (as roots do cliente):
 * vale o primeiro em que o bth-ui foi encontrado; senão, o primeiro que é um projeto.
 */
export function getProjectStateFrom(dirs: string[]): ProjectState {
  const states = dirs.map(getProjectState);
  const first = states[0];
  if (!first) throw new Error('Nenhum diretório para procurar o projeto');

  return (
    states.find(state => state.status === 'ready' || state.status === 'no-docs') ??
    states.find(state => state.status === 'not-installed') ??
    first
  );
}

/** Diz onde fica o projeto, quando a busca começou em uma subpasta dele. */
export function projectHint(state: { searchedFrom: string; projectRoot: string }): string {
  return state.projectRoot === state.searchedFrom ? '' : ` (projeto em \`${state.projectRoot}\`)`;
}

/**
 * Texto em Markdown para os estados em que o MCP não consegue responder sobre
 * componentes. Termina dizendo ao agente o que fazer em seguida.
 */
export function describeBlockedState(state: Exclude<ProjectState, { status: 'ready' }>): string {
  switch (state.status) {
    case 'no-docs':
      return [
        `**Estado do projeto: bth-ui sem documentação.**`,
        ``,
        `O bth-ui instalado é a versão \`${state.bthUi.version}\` (\`${state.bthUi.dir}\`), que não traz \`docs/docs.json\`. ` +
          `A documentação dos componentes é publicada a partir da ${MIN_BTH_UI_VERSION}.`,
        ``,
        `Próximo passo: informe a versão instalada ao usuário e recomende atualizar com \`npm install bth-ui@latest\`. ` +
          `Não invente componentes, props ou eventos enquanto isso. Os guias de instalação e configuração continuam disponíveis.`,
      ].join('\n');

    case 'not-installed':
      return [
        `**Estado do projeto: bth-ui não instalado.**`,
        ``,
        `Não encontrei \`node_modules/bth-ui\` a partir de \`${state.searchedFrom}\`${projectHint(state)}. ` +
          `Sem a lib instalada não há documentação de componentes para consultar.`,
        ``,
        `Próximo passo: pergunte ao usuário se pode instalar e configurar o bth-ui agora ou se ele prefere apenas as instruções. ` +
          `Não altere nada no projeto antes da resposta. Se ele autorizar, siga \`get_installation_guide\` e \`get_setup_guide\` ` +
          `e depois chame esta tool de novo. Não invente componentes enquanto isso.`,
      ].join('\n');

    case 'unknown-project':
      return [
        `**Estado do projeto: projeto não identificado.**`,
        ``,
        `Não encontrei \`package.json\` nem \`node_modules/bth-ui\` a partir de \`${state.searchedFrom}\`.`,
        ``,
        `Próximo passo: pergunte ao usuário o caminho do projeto de front-end e o framework (Angular ou AngularJS). ` +
          `Se o projeto não usa npm, ofereça as instruções manuais de \`get_installation_guide\`. Não invente componentes enquanto isso.`,
      ].join('\n');
  }
}
