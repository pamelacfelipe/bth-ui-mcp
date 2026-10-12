import { z } from 'zod';
import type { BthUiServer } from '../server.js';
import { userPrompt } from '../util/format.js';

const description = 'Revisa o uso dos componentes do bth-ui em um arquivo ou uma pasta e devolve um relatório, sem editar.';

export function registerRevisarUso(server: BthUiServer) {
  server.mcp.registerPrompt(
    'revisar-uso',
    {
      title: 'Revisar o uso do bth-ui',
      description,
      argsSchema: {
        alvo: z.string().describe('Arquivo ou pasta a revisar.'),
      },
    },
    ({ alvo }) =>
      userPrompt(description, [
        `Revise o uso da biblioteca bth-ui em \`${alvo}\`. Siga estes passos, na ordem:`,
        ``,
        `1. Encontre todos os usos de tags \`bth-*\` no alvo.`,
        `2. Chame \`list_components\` e aponte qualquer tag que não exista no bth-ui instalado. Se a tool responder que a lib não está instalada, pare e siga a orientação dela.`,
        `3. Para cada tag usada, chame \`get_component\` e confira:`,
        `   - se as props existem e se os valores estão entre os permitidos (por exemplo, \`primary\` é uma cor do \`bth-button\`, não uma variante);`,
        `   - se os eventos escutados existem e estão ligados do jeito certo para o framework do projeto (\`get_setup_guide\` com \`topic: "eventos"\`);`,
        `   - se os slots usados existem;`,
        `   - se o uso respeita o "quando usar" e o "quando evitar", incluindo componentes que só fazem sentido dentro de outro.`,
        `4. Devolva um relatório com arquivo e linha de cada problema, o motivo e a correção sugerida. Diga também o que está correto.`,
        ``,
        `Não edite nenhum arquivo: só corrija se eu pedir depois do relatório.`,
      ]),
  );
}
