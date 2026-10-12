import { z } from 'zod';
import { fold } from '../knowledge/search.js';
import type { Component } from '../schema.js';
import type { BthUiServer } from '../server.js';
import { code, errorResult, table, textResult, versionHeader } from '../util/format.js';

const unique = (values: (string | undefined)[]) => [...new Set(values.filter(value => value !== undefined))].sort();

export function registerListComponents(server: BthUiServer) {
  server.mcp.registerTool(
    'list_components',
    {
      title: 'Listar componentes do bth-ui',
      description:
        'Lista todos os componentes do bth-ui instalado no projeto, com categoria, status e resumo. ' +
        'Chame antes de criar ou alterar interface, para saber quais componentes existem: o que não está na lista não existe. ' +
        'Para os detalhes de um componente, chame get_component em seguida.',
      inputSchema: {
        category: z.string().optional().describe('Filtra por categoria, como "feedback" ou "formulário".'),
        status: z.string().optional().describe('Filtra por status, como "beta" ou "stable".'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ category, status }) =>
      server.withKnowledge(({ knowledge }) => {
        const filters: [string, string | undefined, (component: Component) => string | undefined][] = [
          ['category', category, component => component.category],
          ['status', status, component => component.status],
        ];

        let components = knowledge.components;

        for (const [name, value, read] of filters) {
          if (!value) continue;
          components = components.filter(component => fold(read(component) ?? '') === fold(value));

          if (components.length === 0) {
            const valid = unique(knowledge.components.map(read));
            return errorResult(
              `Nenhum componente com ${code(name)} igual a "${value}". Valores existentes: ${valid.map(code).join(', ') || 'nenhum'}. ` +
                `Chame list_components de novo com um desses valores ou sem filtros.`,
            );
          }
        }

        const filtered = components.length !== knowledge.components.length;

        return textResult(
          [
            `# Componentes do bth-ui`,
            versionHeader(knowledge),
            table(
              ['Tag', 'Categoria', 'Status', 'Resumo'],
              components.map(component => [
                code(component.tag),
                component.category ?? '',
                component.status ?? '',
                component.summary,
              ]),
            ),
            `Total: ${components.length} componente(s)` +
              (filtered ? ` de ${knowledge.components.length}, com o filtro aplicado.` : `.`),
            (filtered ? `Chame list_components sem filtros para ver todos. ` : ``) +
              `Componentes que não aparecem aqui não existem na versão instalada do bth-ui.`,
          ].join('\n\n'),
        );
      }),
  );
}
