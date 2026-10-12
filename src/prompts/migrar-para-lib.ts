import { z } from 'zod';
import type { BthUiServer } from '../server.js';
import { userPrompt } from '../util/format.js';

const description = 'Migra um arquivo ou uma pasta para os componentes do bth-ui, apresentando o plano antes de editar.';

export function registerMigrarParaLib(server: BthUiServer) {
  server.mcp.registerPrompt(
    'migrar-para-lib',
    {
      title: 'Migrar para o bth-ui',
      description,
      argsSchema: {
        alvo: z.string().describe('Arquivo ou pasta a migrar.'),
        origem: z.string().optional().describe('Biblioteca ou padrão usado hoje, como "Bootstrap 3".'),
      },
    },
    ({ alvo, origem }) =>
      userPrompt(description, [
        `Migre \`${alvo}\` para os componentes da biblioteca bth-ui${origem ? `, a partir de ${origem}` : ''}. Siga estes passos, na ordem:`,
        ``,
        `1. Leia o alvo e liste os elementos e componentes de interface que ele usa (botões, alertas, etiquetas, ícones e assim por diante).`,
        `2. Chame \`list_components\` para saber quais componentes existem no bth-ui instalado. Se a tool responder que a lib não está instalada, pare e siga a orientação dela.`,
        `3. Para cada elemento, encontre o equivalente com \`search_components\` e confira props, valores permitidos, eventos e slots com \`get_component\`. ` +
          `Respeite o "quando evitar" de cada componente.`,
        `4. **Apresente o plano antes de editar**: uma tabela com o elemento atual, o componente do bth-ui e as props que serão usadas. Aguarde a minha confirmação.`,
        `5. Liste à parte o que não tem equivalente no bth-ui. Não invente componentes, props ou valores: o que não tem equivalente fica como está.`,
        `6. Depois da confirmação, faça a migração. Para ligar props e eventos no framework do projeto, consulte \`get_setup_guide\` com \`topic: "eventos"\`.`,
        `7. Relate o que foi migrado, o que ficou sem equivalente e o que eu devo testar.`,
      ]),
  );
}
