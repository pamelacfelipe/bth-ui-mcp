import { z } from 'zod';
import { resolveTag, suggestTags } from '../knowledge/search.js';
import type { BthUiServer, KnowledgeContext } from '../server.js';
import { code, componentMarkdown, errorResult, tagList, textResult } from '../util/format.js';

/** Ficha do componente ou, se a tag não existe, a mensagem que diz isso e aponta o próximo passo. */
export function describeComponent(tag: string, { knowledge, state }: KnowledgeContext): { found: boolean; text: string } {
  const component = resolveTag(knowledge.components, tag);

  if (component) {
    return { found: true, text: componentMarkdown(component, knowledge, state.framework?.framework ?? null) };
  }

  const suggestions = suggestTags(knowledge.components, tag);

  return {
    found: false,
    text: [
      `O componente "${tag}" não existe no bth-ui@${knowledge.bthUi.version}. Não use essa tag.`,
      suggestions.length > 0
        ? `Você quis dizer ${suggestions.map(code).join(' ou ')}? Chame get_component com essa tag.`
        : `Nenhum componente tem nome parecido: avise o usuário que a lib não tem esse componente. ` +
          `Para procurar uma alternativa pela necessidade, chame search_components.`,
      `Componentes instalados: ${tagList(knowledge.components)}. Chame list_components para ver o resumo de cada um.`,
    ].join('\n\n'),
  };
}

export function registerGetComponent(server: BthUiServer) {
  server.mcp.registerTool(
    'get_component',
    {
      title: 'Documentação de um componente do bth-ui',
      description:
        'Devolve a ficha completa de um componente do bth-ui instalado: quando usar, quando evitar, props com os valores permitidos, ' +
        'eventos, slots, CSS parts e exemplos. Chame antes de escrever ou revisar HTML com o componente, ' +
        'e use apenas as props, os valores e os eventos que a ficha listar.',
      inputSchema: {
        tag: z.string().trim().min(1).describe('Tag do componente, como "bth-button". Também aceita o nome sem prefixo ("button").'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ tag }) =>
      server.withKnowledge(context => {
        const { found, text } = describeComponent(tag, context);
        return found ? textResult(text) : errorResult(text);
      }),
  );
}
