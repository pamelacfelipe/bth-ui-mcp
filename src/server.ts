// createServer() e instruções
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RootsListChangedNotificationSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeError, readKnowledge, type Knowledge } from './knowledge/reader.js';
import { describeBlockedState, getProjectStateFrom, type ProjectState } from './project/state.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerGetComponent } from './tools/get-component.js';
import { registerGetInstallationGuide } from './tools/get-installation-guide.js';
import { registerGetSetupGuide } from './tools/get-setup-guide.js';
import { registerListComponents } from './tools/list-components.js';
import { registerSearchComponents } from './tools/search-components.js';
import { errorResult, textResult } from './util/format.js';
import { logger } from './util/logger.js';

// Tanto `src/server.ts` quanto `dist/bin.js` ficam um nível abaixo do package.json
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const instructions =
  'Este servidor documenta a biblioteca bth-ui (web components). Ao criar ou alterar interface com a lib, ' +
  'consulte list_components e get_component antes de escrever HTML. Use apenas componentes, props e eventos ' +
  'retornados pelas tools. Se um componente não existir, diga isso ao usuário em vez de inventar. ' +
  'Para instalar ou configurar a lib, use get_installation_guide e get_setup_guide.';

export interface KnowledgeContext {
  knowledge: Knowledge;
  state: Extract<ProjectState, { status: 'ready' }>;
}

export interface BthUiServer {
  mcp: McpServer;
  /** Estado do projeto do usuário, recalculado a cada chamada. */
  getProjectState(): Promise<ProjectState>;
  /**
   * Roda uma tool que depende da documentação do bth-ui instalado. Fora do
   * estado "pronto", responde com o estado e o próximo passo para o agente.
   */
  withKnowledge(handler: (context: KnowledgeContext) => CallToolResult): Promise<CallToolResult>;
  /** O mesmo que `withKnowledge`, para quem precisa montar a própria resposta (resources). */
  loadKnowledge(): Promise<KnowledgeResult>;
}

export type KnowledgeResult =
  | ({ ok: true } & KnowledgeContext)
  /** `message` já diz ao agente qual é o próximo passo. */
  | { ok: false; isError: boolean; state: ProjectState; message: string };

export function createServer(): BthUiServer {
  const mcp = new McpServer({ name: 'bth-ui', version }, { instructions });

  let roots: string[] | null = null;

  mcp.server.setNotificationHandler(RootsListChangedNotificationSchema, () => {
    roots = null;
  });

  /** Roots enviadas pelo cliente; sem elas, o diretório onde o servidor foi iniciado. */
  async function searchDirs(): Promise<string[]> {
    if (!roots && mcp.server.getClientCapabilities()?.roots) {
      try {
        const result = await mcp.server.listRoots();
        roots = result.roots.filter(root => root.uri.startsWith('file://')).map(root => fileURLToPath(root.uri));
      } catch (error) {
        logger.warn('não foi possível ler as roots do cliente', error);
        roots = [];
      }
    }
    return roots?.length ? roots : [process.cwd()];
  }

  const server: BthUiServer = {
    mcp,
    getProjectState: async () => getProjectStateFrom(await searchDirs()),
    async loadKnowledge() {
      const state = await server.getProjectState();
      if (state.status !== 'ready') {
        return { ok: false, isError: false, state, message: describeBlockedState(state) };
      }

      try {
        return { ok: true, knowledge: readKnowledge(state.bthUi), state };
      } catch (error) {
        if (error instanceof KnowledgeError) return { ok: false, isError: true, state, message: error.message };
        throw error;
      }
    },
    async withKnowledge(handler) {
      const result = await server.loadKnowledge();
      if (result.ok) return handler(result);
      return result.isError ? errorResult(result.message) : textResult(result.message);
    },
  };

  registerGetInstallationGuide(server);
  registerGetSetupGuide(server);
  registerListComponents(server);
  registerSearchComponents(server);
  registerGetComponent(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
