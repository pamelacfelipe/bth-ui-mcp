# Instalação do bth-ui em AngularJS

O bth-ui é uma biblioteca de web components (Stencil). No AngularJS ele é usado como tags HTML comuns: não há módulo AngularJS para injetar.

## Pré-requisitos

- AngularJS 1.4 ou superior.
- Navegadores com suporte a módulos ES (`<script type="module">`). O bth-ui não tem build para navegadores antigos, como o Internet Explorer.
- Node 20 ou superior, se o projeto instala dependências com npm.

## 1. Instalar o pacote

```bash
npm install bth-ui
```

Se o projeto não usa npm (scripts soltos ou bower), pule este passo e use a opção B do passo 2 com a URL de um CDN.

## 2. Registrar os componentes

Escolha a opção que combina com a forma como o projeto carrega scripts.

### Opção A: projeto com bundler (webpack, por exemplo)

No arquivo de entrada da aplicação, antes do `angular.bootstrap` ou do módulo principal:

```js
import { defineCustomElements } from 'bth-ui/loader';

defineCustomElements();
```

**Webpack 4 ou anterior:** o código do bth-ui usa sintaxe moderna de JavaScript (campos de classe), que o webpack 4 não entende, e o build falha com `Module parse failed: Unexpected token` em `node_modules/bth-ui`. Faça o `babel-loader` processar também o bth-ui, tirando-o do `exclude` e garantindo o plugin de campos de classe:

```js
{
  test: /\.js$/,
  exclude: /node_modules\/(?!bth-ui)/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env'],
      plugins: ['@babel/plugin-transform-class-properties'],
    },
  },
}
```

Se o `exclude` do projeto já libera outros pacotes, acrescente `bth-ui` à mesma lista, como em `/node_modules\/(?!pacote-a|pacote-b|bth-ui)/`. Se não for possível mudar a configuração do webpack, use a opção B. O webpack 5 não precisa desse ajuste.

### Opção B: projeto com tags `<script>`

No `index.html`, junto dos outros scripts:

```html
<script type="module" src="node_modules/bth-ui/dist/bth-ui/bth-ui.esm.js"></script>
```

Esse arquivo registra todas as tags `bth-*` e carrega os outros arquivos da mesma pasta sob demanda. Por isso a pasta `node_modules/bth-ui/dist/bth-ui/` inteira precisa ser servida pelo servidor da aplicação. Se o projeto copia dependências para uma pasta pública, copie a pasta toda, não só o `bth-ui.esm.js`.

Sem npm, use um CDN, fixando a versão:

```html
<script type="module" src="https://unpkg.com/bth-ui@0.0.2/dist/bth-ui/bth-ui.esm.js"></script>
```

## 3. Estilos

Não há CSS global para importar: o pacote não publica nenhum arquivo `.css`, e cada componente já carrega o próprio estilo.

## 4. Fontes

O pacote não inclui as fontes. Adicione ao `<head>` do `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900" rel="stylesheet">
```

- **Material Symbols Outlined** é obrigatória para o `bth-icon`. Sem ela, o ícone aparece como texto (por exemplo `check_circle`).
- **Geist** é a fonte padrão dos componentes. Sem ela, eles usam a fonte sem serifa do sistema.

Para não depender do Google Fonts, veja a seção de fontes do guia de configuração (`get_setup_guide` com `topic: "fonte"`).

## 5. Verificar

Coloque em qualquer template da aplicação:

```html
<bth-button color="primary">
  <bth-icon name="check_circle"></bth-icon>
  Salvar
</bth-button>
```

Abra a aplicação e confira:

- o botão aparece azul, com o texto "Salvar";
- o ícone aparece como um símbolo, não como o texto `check_circle`;
- no console do navegador, `customElements.get('bth-button')` devolve uma classe, não `undefined`.

## Problemas comuns

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| O build falha com `Module parse failed: Unexpected token` em `node_modules/bth-ui` | Webpack 4 ou anterior não entende a sintaxe do bth-ui | Inclua o bth-ui no `babel-loader` ou use a opção B (passo 2) |
| A tag aparece no HTML, mas sem estilo e sem comportamento | Os componentes não foram registrados | Confira o passo 2 e se o script carregou (aba de rede) |
| Erro 404 em arquivos `p-*.js` | Só o `bth-ui.esm.js` está sendo servido | Sirva a pasta `dist/bth-ui/` inteira (opção B do passo 2) |
| O ícone aparece como texto | A fonte Material Symbols Outlined não carregou | Confira os `<link>` do passo 4 |
| `ng-on-*` não dispara | AngularJS anterior à 1.7.3 | Use uma diretiva com `addEventListener` (`get_setup_guide` com `topic: "eventos"`) |
| Um valor de prop é ignorado | O valor não existe para aquela prop | Confira os valores permitidos com `get_component` |
