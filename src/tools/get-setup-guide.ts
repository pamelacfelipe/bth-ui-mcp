import { z } from 'zod';
import {
  chooseFramework,
  frameworkNames,
  readGuide,
  readSetupTopic,
  setupTopics,
  type SetupTopic,
} from '../knowledge/guides.js';
import { fold } from '../knowledge/search.js';
import type { BthUiServer } from '../server.js';
import { errorResult, textResult } from '../util/format.js';

const topics = Object.keys(setupTopics) as SetupTopic[];
const topicList = topics.map(topic => `\`${topic}\``).join(', ');

export function registerGetSetupGuide(server: BthUiServer) {
  server.mcp.registerTool(
    'get_setup_guide',
    {
      title: 'Guia de configuração do bth-ui',
      description:
        'Devolve o guia de configuração do bth-ui em Angular ou AngularJS: registro dos componentes, estilos, fontes, tokens (cores e medidas), ' +
        'como passar props e escutar eventos, e uso em formulários. Chame quando o usuário perguntar como configurar ou personalizar a lib, ' +
        'ou como ligar props e eventos no framework. Use `topic` para receber só uma seção.',
      inputSchema: {
        framework: z
          .string()
          .optional()
          .describe('"angular" ou "angularjs". Se omitido, é detectado pelo package.json do projeto.'),
        topic: z
          .string()
          .optional()
          .describe(`Seção do guia: ${topics.join(', ')}. Se omitido, devolve o guia completo.`),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ framework, topic }) => {
      const state = await server.getProjectState();
      const choice = chooseFramework(framework, state.framework);

      if (!choice.ok) {
        return choice.isError ? errorResult(choice.message) : textResult(choice.message);
      }

      if (!topic) return textResult(readGuide('setup', choice.framework));

      const selected = topics.find(candidate => candidate === fold(topic));
      if (!selected) {
        return errorResult(
          `Tópico "${topic}" não existe. Tópicos aceitos: ${topicList}. Chame get_setup_guide de novo com um deles ou sem \`topic\` para o guia completo.`,
        );
      }

      return textResult(
        [
          `# Configuração do bth-ui em ${frameworkNames[choice.framework]}`,
          readSetupTopic(choice.framework, selected),
          `Outros tópicos: ${topics
            .filter(candidate => candidate !== selected)
            .map(candidate => `\`${candidate}\``)
            .join(', ')}.`,
        ].join('\n\n'),
      );
    },
  );
}
