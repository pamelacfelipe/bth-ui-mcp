import { z } from 'zod';
import { searchComponents, type SearchHit } from '../knowledge/search.js';
import type { BthUiServer } from '../server.js';
import { tagList, textResult, versionHeader } from '../util/format.js';

const hitList = (hits: SearchHit[]) =>
  hits
    .map(
      ({ component, reasons, usageWhen }, index) =>
        [
          `${index + 1}. \`${component.tag}\`: ${component.summary}`,
          `   - Motivo: ${reasons.join('; ')}`,
          ...usageWhen.map(sentence => `   - Quando usar: ${sentence}`),
        ].join('\n'),
    )
    .join('\n');

export function registerSearchComponents(server: BthUiServer) {
  server.mcp.registerTool(
    'search_components',
    {
      title: 'Buscar componentes do bth-ui',
      description:
        'Busca, entre os componentes do bth-ui instalado, os que atendem a uma necessidade descrita em texto livre ' +
        '(por exemplo "mostrar o status de um item" ou "botão destrutivo"). Chame quando não souber qual componente usar. ' +
        'Se nada for encontrado, o componente não existe na lib: avise o usuário em vez de inventar.',
      inputSchema: {
        query: z.string().trim().min(1).describe('O que se quer fazer ou o nome aproximado do componente.'),
        limit: z.number().int().min(1).max(20).default(5).describe('Número máximo de resultados.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, limit }) =>
      server.withKnowledge(({ knowledge }) => {
        const { components } = knowledge;
        const hits = searchComponents(components, query, limit);
        const header = [`# Busca por "${query}"`, versionHeader(knowledge)];

        if (hits.length > 0) {
          return textResult(
            [
              ...header,
              hitList(hits),
              `Confira o motivo de cada resultado antes de escolher e chame get_component para ver props, eventos e exemplos. ` +
                `Se nenhum resultado for o que você procura, o componente não existe no bth-ui instalado: avise o usuário em vez de inventar.`,
              `Todos os componentes instalados: ${tagList(components)}.`,
            ].join('\n\n'),
          );
        }

        const closest = searchComponents(components, query, 3, true);

        return textResult(
          [
            ...header,
            `Nenhum componente do bth-ui instalado atende a "${query}". Não existe um componente para isso nesta versão da lib: ` +
              `avise o usuário e não invente uma tag.`,
            closest.length > 0
              ? `Mais próximos, com correspondência fraca (confira se servem antes de sugerir):\n\n${hitList(closest)}`
              : `Também não há componentes parecidos.`,
            `Todos os componentes instalados: ${tagList(components)}.`,
          ].join('\n\n'),
        );
      }),
  );
}
