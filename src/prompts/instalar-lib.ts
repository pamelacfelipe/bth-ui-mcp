import { z } from 'zod';
import type { BthUiServer } from '../server.js';
import { userPrompt } from '../util/format.js';

const description = 'Instala e configura o bth-ui no projeto, perguntando antes de alterar qualquer coisa.';

export function registerInstalarLib(server: BthUiServer) {
  server.mcp.registerPrompt(
    'instalar-lib',
    {
      title: 'Instalar o bth-ui',
      description,
      argsSchema: {
        framework: z.string().optional().describe('"angular" ou "angularjs". Se omitido, é detectado pelo package.json.'),
      },
    },
    ({ framework }) =>
      userPrompt(description, [
        `Instale e configure a biblioteca bth-ui neste projeto${framework ? ` (${framework})` : ''}. Siga estes passos, na ordem:`,
        ``,
        `1. Chame \`get_installation_guide\`${framework ? ` com \`framework: "${framework}"\`` : ''} para saber o estado do projeto e receber o guia. ` +
          `Se a tool não conseguir detectar o framework, pergunte-me se o projeto é Angular ou AngularJS.`,
        `2. Se o bth-ui já estiver instalado, não reinstale: confira apenas se o registro dos componentes e as fontes estão configurados e relate o que falta.`,
        `3. Se não estiver instalado, **pergunte-me** se pode instalar e configurar agora ou se prefiro só as instruções. Não rode comandos nem edite arquivos antes da minha resposta.`,
        `4. Se eu autorizar, siga o guia: instale o pacote, registre os componentes, adicione as fontes e, no Angular, o \`CUSTOM_ELEMENTS_SCHEMA\`. ` +
          `Não importe CSS do bth-ui: o guia explica que não existe CSS global.`,
        `5. Faça a verificação do guia, renderizando um \`bth-button\` com um \`bth-icon\`. Antes de escrever o HTML, confira as props com \`get_component\`.`,
        `6. Relate os arquivos alterados, os comandos executados e o que eu preciso conferir no navegador.`,
        ``,
        `Se eu preferir só as instruções, mostre o guia e não altere nada.`,
      ]),
  );
}
