# bth-ui-mcp

Servidor MCP da biblioteca de web components [bth-ui](https://github.com/pamelacfelipe/bth-ui). Ele dá ao assistente de IA (Claude Code ou Codex) a documentação da lib, para que ele use os componentes, as props e os eventos que existem de fato, em vez de inventar.

O servidor responde a quatro perguntas:

- como instalar o bth-ui em um projeto Angular ou AngularJS;
- como configurar a lib (registro, fontes, tokens, props e eventos);
- qual componente usar para uma necessidade;
- como usar um componente.

A documentação dos componentes é lida do **bth-ui instalado no projeto** (`node_modules/bth-ui/docs/`). Por isso as respostas sempre correspondem à versão em uso, e trocar a versão da lib muda as respostas sem atualizar o MCP.

## Instalação

Requer Node 20 ou superior. O servidor precisa iniciar na pasta do projeto de front-end, que é o comportamento padrão dos dois clientes.

### Claude Code

Na raiz do projeto:

```bash
claude mcp add --scope project bth-ui -- npx -y bth-ui-mcp
```

O comando cria o arquivo `.mcp.json`, que pode ser commitado para valer para o time inteiro. Conteúdo equivalente:

```json
{
  "mcpServers": {
    "bth-ui": { "command": "npx", "args": ["-y", "bth-ui-mcp"] }
  }
}
```

### Codex

```bash
codex mcp add bth-ui -- npx -y bth-ui-mcp
```

Ou, no arquivo `~/.codex/config.toml`:

```toml
[mcp_servers.bth-ui]
command = "npx"
args = ["-y", "bth-ui-mcp"]
```

### Windows

Se o cliente não conseguir iniciar o `npx` diretamente, use `cmd` como comando: `cmd /c npx -y bth-ui-mcp`.

## Regras para o projeto

O servidor já envia instruções ao cliente na inicialização, mas o uso fica mais consistente quando o texto abaixo está no arquivo de regras do projeto: `CLAUDE.md` (Claude Code) ou `AGENTS.md` (Codex).

```markdown
## bth-ui

Este projeto usa a biblioteca bth-ui (web components), documentada pelo servidor MCP `bth-ui`.

- Ao criar ou alterar interface com a lib, consulte `list_components` e `get_component` antes de escrever HTML.
- Use apenas componentes, props, valores e eventos retornados pelas tools.
- Se um componente não existir, diga isso em vez de inventar uma tag.
- Para instalar ou configurar a lib, use `get_installation_guide` e `get_setup_guide`.
- Se o bth-ui não estiver instalado, pergunte antes de instalar.
```

## O que o servidor oferece

### Tools

| Tool | Para que serve | Entrada |
| --- | --- | --- |
| `get_installation_guide` | Guia de instalação e estado do bth-ui no projeto | `framework` (opcional): `angular` ou `angularjs` |
| `get_setup_guide` | Guia de configuração, completo ou por seção | `framework` (opcional) e `topic` (opcional): `registro`, `estilos`, `fonte`, `tokens`, `eventos` ou `formularios` |
| `list_components` | Lista os componentes instalados, com categoria, status e resumo | `category` e `status` (opcionais) |
| `search_components` | Busca componentes por necessidade, em texto livre | `query` e `limit` (padrão 5) |
| `get_component` | Ficha de um componente: quando usar, quando evitar, props, eventos, slots, CSS parts e exemplos | `tag` (aceita `bth-button` ou `button`) |

Quando `framework` é omitido, ele é detectado pelo `package.json` do projeto: `@angular/core` indica Angular e `angular` indica AngularJS.

### Resources

| URI | Conteúdo |
| --- | --- |
| `docs://install/angular`, `docs://install/angularjs` | Guias de instalação |
| `docs://setup/{framework}` | Guia de configuração |
| `docs://components/{tag}` | Ficha do componente, a mesma de `get_component` |
| `docs://tokens` | Design tokens do bth-ui instalado, em JSON |

### Prompts

No Claude Code, os prompts aparecem como comandos `/mcp__bth-ui__<nome>`.

| Prompt | O que faz | Argumentos |
| --- | --- | --- |
| `instalar-lib` | Instala e configura o bth-ui, perguntando antes de alterar o projeto | `framework` (opcional) |
| `migrar-para-lib` | Migra um arquivo ou uma pasta para os componentes do bth-ui, apresentando o plano antes de editar | `alvo` e `origem` (opcional) |
| `revisar-uso` | Revisa o uso do bth-ui e devolve um relatório com arquivo e linha, sem editar | `alvo` |

Se o cliente não expuser prompts MCP, o mesmo trabalho pode ser pedido em texto: as tools cobrem todos os passos.

## Estados do projeto

Antes de responder sobre componentes, o servidor confere o projeto:

| Estado | Quando acontece | O que o servidor faz |
| --- | --- | --- |
| Pronto | bth-ui instalado, com `docs/docs.json` | Responde normalmente |
| Sem documentação | bth-ui instalado em versão anterior à 0.0.2 | Informa a versão e recomenda atualizar. Os guias continuam disponíveis |
| Não instalado | `node_modules/bth-ui` não encontrado | Pede ao assistente que pergunte se pode instalar e configurar, ou se você prefere só as instruções |
| Projeto não identificado | Sem `package.json` | Pede o caminho do projeto e o framework |

O servidor é somente leitura. Ele não instala pacotes, não executa comandos, não acessa a rede e não altera arquivos: lê apenas o `package.json` do projeto e a pasta `node_modules/bth-ui`. Qualquer mudança no projeto é feita pelo assistente, com as permissões do próprio cliente.

## Compatibilidade

| bth-ui-mcp | bth-ui | Observação |
| --- | --- | --- |
| 0.0.1 | 0.0.2 ou superior | Documentação gerada com o Stencil 4 |
| 0.0.1 | 0.0.1 | Só os guias; a lib ainda não publicava a documentação dos componentes |

O contrato entre os dois pacotes são os arquivos `docs/docs.json` e `docs/tokens.json` dentro do bth-ui. O MCP ignora campos que não conhece; se um campo essencial mudar de formato, a resposta traz um erro com as versões do bth-ui e do Stencil.

Os guias foram executados com o bth-ui 0.0.2 em:

- Angular 18, com o builder padrão do Angular CLI;
- AngularJS 1.4.14, com webpack 4 e babel, e também com tag `<script type="module">`;
- AngularJS 1.8.3, para a sintaxe `ng-on-*`.

## Solução de problemas

| Sintoma | O que conferir |
| --- | --- |
| O assistente diz que o bth-ui não está instalado, mas está | O servidor procura `node_modules/bth-ui` a partir das pastas do workspace enviadas pelo cliente ou, sem elas, da pasta onde foi iniciado. A resposta mostra onde ele procurou: confira se é a pasta do projeto de front-end |
| O framework não é detectado | O projeto não tem `package.json` ou não declara `@angular/core` nem `angular`. Informe o framework na pergunta |
| O assistente ignora o MCP e gera HTML genérico | Adicione o trecho de regras ao `CLAUDE.md` ou ao `AGENTS.md` |
| A busca não encontra um componente por um nome usual | Os sinônimos ficam em `content/aliases.json`; abra uma issue ou um PR com o termo que faltou |

Para ver o que o servidor está fazendo, defina a variável de ambiente `BTH_UI_MCP_LOG_LEVEL` como `debug`. Os logs saem no `stderr`; os níveis são `debug`, `info`, `warn`, `error` e `silent`.

## Desenvolvimento

```bash
npm install
npm test           # testes (vitest)
npm run typecheck  # tipos
npm run build      # gera dist/bin.js
npm run inspect    # abre o MCP Inspector com o servidor local
```

Para testar o servidor local em um projeto, aponte o cliente para o arquivo gerado:

```bash
claude mcp add --scope project bth-ui -- node /caminho/para/bth-ui-mcp/dist/bin.js
```

Organização do código:

- `src/project/`: localiza o projeto e o bth-ui e define o estado.
- `src/knowledge/`: lê e valida a documentação, normaliza os componentes, faz a busca e carrega os guias.
- `src/tools/`, `src/resources/`, `src/prompts/`: o que o servidor expõe.
- `content/`: guias de instalação e configuração e os sinônimos da busca.
- `test/fixtures/`: `docs.json` e `tokens.json` de cada versão do bth-ui coberta pelos testes.

Ao mudar um guia, execute-o em um projeto real antes de publicar: o conteúdo vai direto para o contexto do assistente.

## Licença

MIT
