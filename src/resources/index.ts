// resources docs://
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { frameworkNames, readGuide } from '../knowledge/guides.js';
import { MIN_BTH_UI_VERSION } from '../project/state.js';
import { frameworks, type Framework } from '../schema.js';
import type { BthUiServer } from '../server.js';
import { describeComponent } from '../tools/get-component.js';

const markdown = (uri: URL, text: string) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text }] });
const json = (uri: URL, value: unknown) => ({
  contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }],
});

const startsWith = (values: string[], typed: string) => values.filter(value => value.startsWith(typed.toLowerCase()));

function parseFramework(value: unknown): Framework {
  const framework = frameworks.find(name => name === String(value).toLowerCase());
  if (!framework) {
    throw new Error(`Framework "${String(value)}" não é aceito. Valores aceitos: ${frameworks.join(', ')}.`);
  }
  return framework;
}

export function registerResources(server: BthUiServer) {
  const { mcp } = server;

  for (const framework of frameworks) {
    mcp.registerResource(
      `install-${framework}`,
      `docs://install/${framework}`,
      {
        title: `Instalação do bth-ui em ${frameworkNames[framework]}`,
        description: `Guia de instalação do bth-ui para ${frameworkNames[framework]}.`,
        mimeType: 'text/markdown',
      },
      uri => markdown(uri, readGuide('install', framework)),
    );
  }

  mcp.registerResource(
    'setup',
    new ResourceTemplate('docs://setup/{framework}', {
      list: () => ({
        resources: frameworks.map(framework => ({
          uri: `docs://setup/${framework}`,
          name: `setup-${framework}`,
          title: `Configuração do bth-ui em ${frameworkNames[framework]}`,
          mimeType: 'text/markdown',
        })),
      }),
      complete: { framework: typed => startsWith([...frameworks], typed) },
    }),
    {
      title: 'Configuração do bth-ui',
      description: 'Guia de configuração do bth-ui: registro, estilos, fontes, tokens, props e eventos, formulários.',
      mimeType: 'text/markdown',
    },
    (uri, { framework }) => markdown(uri, readGuide('setup', parseFramework(framework))),
  );

  /** Tags do bth-ui instalado; vazio quando a lib não está pronta para leitura. */
  async function installedTags(): Promise<string[]> {
    const result = await server.loadKnowledge();
    return result.ok ? result.knowledge.components.map(component => component.tag) : [];
  }

  mcp.registerResource(
    'component',
    new ResourceTemplate('docs://components/{tag}', {
      list: async () => {
        const result = await server.loadKnowledge();
        if (!result.ok) return { resources: [] };

        return {
          resources: result.knowledge.components.map(component => ({
            uri: `docs://components/${component.tag}`,
            name: component.tag,
            description: component.summary,
            mimeType: 'text/markdown',
          })),
        };
      },
      complete: {
        tag: async typed => {
          const tags = await installedTags();
          const name = typed.toLowerCase();
          return tags.filter(tag => tag.startsWith(name) || tag.startsWith(`bth-${name}`));
        },
      },
    }),
    {
      title: 'Componente do bth-ui',
      description: 'Ficha de um componente do bth-ui instalado, a mesma devolvida por get_component.',
      mimeType: 'text/markdown',
    },
    async (uri, { tag }) => {
      const result = await server.loadKnowledge();
      // Fora do estado "pronto", o conteúdo é o próprio estado, com o próximo passo
      if (!result.ok) return markdown(uri, result.message);

      return markdown(uri, describeComponent(String(tag), result).text);
    },
  );

  mcp.registerResource(
    'tokens',
    'docs://tokens',
    {
      title: 'Design tokens do bth-ui',
      description:
        'Design tokens do bth-ui instalado, com nome, valor padrão, custom property CSS que o sobrescreve (cssVariable) e arquivo de origem.',
      mimeType: 'application/json',
    },
    async uri => {
      const result = await server.loadKnowledge();
      if (!result.ok) return json(uri, { status: result.state.status, message: result.message });

      const { bthUi, tokens } = result.knowledge;
      const source = { bthUi: `bth-ui@${bthUi.version}`, path: bthUi.dir };

      if (!tokens) {
        return json(uri, {
          ...source,
          status: 'no-tokens',
          message: `O bth-ui@${bthUi.version} não traz docs/tokens.json, publicado a partir da ${MIN_BTH_UI_VERSION}. Recomende atualizar a lib.`,
        });
      }

      return json(uri, { ...source, tokens });
    },
  );
}
