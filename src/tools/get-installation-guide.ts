import { z } from 'zod';
import { chooseFramework, frameworkNames, readGuide } from '../knowledge/guides.js';
import { MIN_BTH_UI_VERSION, projectHint, type ProjectState } from '../project/state.js';
import type { BthUiServer } from '../server.js';
import { errorResult, textResult } from '../util/format.js';

/** Situação do bth-ui no projeto, que abre a resposta do guia de instalação. */
function describeInstallState(state: ProjectState): string {
  switch (state.status) {
    case 'ready':
      return (
        `**Estado do projeto:** o bth-ui@${state.bthUi.version} já está instalado em \`${state.bthUi.dir}\`. ` +
        `Não é preciso instalar o pacote de novo: use o guia para conferir o registro dos componentes e as fontes.`
      );
    case 'no-docs':
      return (
        `**Estado do projeto:** o bth-ui instalado é a versão \`${state.bthUi.version}\` (\`${state.bthUi.dir}\`), anterior à ${MIN_BTH_UI_VERSION} ` +
        `e sem a documentação dos componentes. Recomende ao usuário atualizar com \`npm install bth-ui@latest\`.`
      );
    case 'not-installed':
      return `**Estado do projeto:** o bth-ui não está instalado. Procurei \`node_modules/bth-ui\` a partir de \`${state.searchedFrom}\`${projectHint(state)}.`;
    case 'unknown-project':
      return (
        `**Estado do projeto:** projeto não identificado. Não encontrei \`package.json\` nem \`node_modules/bth-ui\` a partir de \`${state.searchedFrom}\`. ` +
        `Confirme com o usuário o caminho do projeto de front-end; se ele não usa npm, siga as instruções manuais do guia.`
      );
  }
}

const askBeforeInstalling =
  `**Antes de alterar qualquer coisa:** se o usuário ainda não pediu de forma explícita para instalar o bth-ui, pergunte se pode instalar e configurar agora ` +
  `ou se ele prefere apenas as instruções, e não rode comandos nem edite arquivos antes da resposta. Com a autorização, siga os passos acima na ordem: ` +
  `instale o pacote primeiro e só edite os arquivos do projeto depois que a instalação der certo, para não deixar imports de um pacote que não existe. ` +
  `Faça a verificação e relate o que foi alterado. Depois da instalação, as tools de componentes passam a responder.`;

export function registerGetInstallationGuide(server: BthUiServer) {
  server.mcp.registerTool(
    'get_installation_guide',
    {
      title: 'Guia de instalação do bth-ui',
      description:
        'Devolve o guia para instalar o bth-ui em um projeto Angular ou AngularJS (pacote, registro dos componentes, fontes e verificação) ' +
        'e informa se a lib já está instalada no projeto. Chame quando o usuário pedir para instalar a lib, ' +
        'quando outra tool responder que o bth-ui não está instalado ou para conferir uma instalação que não funciona.',
      inputSchema: {
        framework: z
          .string()
          .optional()
          .describe('"angular" ou "angularjs". Se omitido, é detectado pelo package.json do projeto.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ framework }) => {
      const state = await server.getProjectState();
      const choice = chooseFramework(framework, state.framework);
      const stateText = describeInstallState(state);

      if (!choice.ok) {
        const text = `${stateText}\n\n${choice.message}`;
        return choice.isError ? errorResult(text) : textResult(text);
      }

      const detected = choice.detected
        ? `Framework detectado pelo \`package.json\`: ${frameworkNames[choice.framework]} (\`${state.framework?.version}\`).`
        : null;
      const installed = state.status === 'ready' || state.status === 'no-docs';

      return textResult(
        [stateText, detected, readGuide('install', choice.framework), installed ? null : askBeforeInstalling]
          .filter(Boolean)
          .join('\n\n'),
      );
    },
  );
}
