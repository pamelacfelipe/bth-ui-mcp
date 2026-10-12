# Configuração do bth-ui em AngularJS

## Registro dos componentes

Os componentes são registrados uma vez, fora do AngularJS. Não há módulo para injetar.

Em projeto com bundler, no arquivo de entrada:

```js
import { defineCustomElements } from 'bth-ui/loader';

defineCustomElements();
```

Com webpack 4 ou anterior, o `babel-loader` precisa processar também o bth-ui (tire-o do `exclude`), senão o build falha com `Module parse failed`. O passo a passo está em `get_installation_guide`.

Em projeto com tags `<script>`, no `index.html`:

```html
<script type="module" src="node_modules/bth-ui/dist/bth-ui/bth-ui.esm.js"></script>
```

Nesse caso a pasta `node_modules/bth-ui/dist/bth-ui/` inteira precisa ser servida, porque o código de cada componente é carregado sob demanda a partir dela.

## Estilos

Não há CSS global para importar: o pacote não publica nenhum arquivo `.css`, e cada componente já carrega o próprio estilo.

A aparência é ajustada pelos tokens (seção "Tokens") e, em pontos específicos, pelas CSS parts de cada componente, listadas em `get_component`:

```css
bth-alert::part(dismiss) {
  opacity: 0.6;
}
```

Os componentes, com exceção do `bth-icon`, usam shadow DOM: seletores CSS da aplicação não alcançam o que está dentro deles, só o próprio elemento, as parts e o conteúdo dos slots.

## Fontes

O pacote não inclui fontes. São duas:

- **Material Symbols Outlined**: obrigatória para o `bth-icon`, que renderiza `<span class="material-symbols-outlined">` com o nome do ícone. A classe e a fonte precisam estar em um CSS global.
- **Geist**: fonte padrão dos componentes. É opcional: sem ela, vale a fonte sem serifa do sistema.

**Pelo Google Fonts**, no `<head>` do `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900" rel="stylesheet">
```

**Por pacotes npm**, para servir as fontes junto da aplicação:

```bash
npm install material-symbols @fontsource-variable/geist
```

```html
<link rel="stylesheet" href="node_modules/material-symbols/outlined.css">
<link rel="stylesheet" href="node_modules/@fontsource-variable/geist/index.css">
```

O pacote `@fontsource-variable/geist` registra a família como `Geist Variable`. Aponte os componentes para ela no CSS da aplicação:

```css
:root {
  --bth-font-family: 'Geist Variable', sans-serif;
}
```

Para usar a fonte da própria aplicação nos componentes, defina `--bth-font-family` do mesmo jeito.

## Tokens

Os design tokens do bth-ui são custom properties CSS com o prefixo `--bth-`. Cada uma tem um valor padrão embutido nos componentes; para mudar, defina a propriedade no CSS da aplicação:

```css
:root {
  --bth-color-primary: #5b21b6;
  --bth-color-primary-contrast: #ffffff;
  --bth-radius-md: 4px;
}
```

- A lista completa, com os valores padrão, está no resource `docs://tokens`. O campo `cssVariable` de cada token é o nome da propriedade a sobrescrever.
- As cores da paleta seguem o padrão `--bth-color-<nome>` e `--bth-color-<nome>-contrast`, com os nomes `primary`, `success`, `danger`, `warning`, `info` e `accent`.
- Definida em um seletor mais específico, a propriedade vale só para aquele trecho da página.
- As variáveis SASS (`$nome`) existem só no código-fonte da lib e não são publicadas: use sempre as custom properties.

## Props e eventos

Valores fixos vão como atributos, e valores dinâmicos com interpolação:

```html
<bth-button color="danger" variant="outline">Excluir</bth-button>
<bth-button color="{{ vm.cor }}">Salvar</bth-button>
```

Para props booleanas, a presença do atributo já vale como verdadeiro, então `disabled="{{ vm.salvando }}"` desabilita sempre. Use `ng-attr-`, que remove o atributo quando a expressão resulta em `undefined`:

```html
<bth-button ng-attr-disabled="{{ vm.salvando || undefined }}">Salvar</bth-button>
```

Eventos customizados dependem da versão do AngularJS.

**AngularJS 1.7.3 ou superior:** use `ng-on-*`. Letras maiúsculas do nome do evento são escritas com `_` antes da letra minúscula, então `bthDismiss` vira `bth_dismiss`:

```html
<bth-alert variant="success" dismissible ng-on-bth_dismiss="vm.aoFechar($event)">
  <bth-alert-title>Salvo</bth-alert-title>
</bth-alert>
```

**Versões anteriores à 1.7.3:** não existe `ng-on-*`. Crie uma diretiva que registra o evento e avisa o AngularJS:

```js
angular.module('app').directive('onBthDismiss', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var handler = $parse(attrs.onBthDismiss);

      element[0].addEventListener('bthDismiss', function (event) {
        scope.$apply(function () {
          handler(scope, { $event: event });
        });
      });
    },
  };
}]);
```

```html
<bth-alert variant="success" dismissible on-bth-dismiss="vm.aoFechar($event)">
  <bth-alert-title>Salvo</bth-alert-title>
</bth-alert>
```

Eventos nativos, como `ng-click`, funcionam normalmente. Use só as props, os valores e os eventos listados em `get_component`.

## Formulários

O `bth-button` com `type="submit"` envia o formulário mais próximo e, com `type="reset"`, limpa. O envio dispara o evento `submit` do formulário, então `ng-submit` funciona:

```html
<form name="vm.form" ng-submit="vm.salvar()">
  <input ng-model="vm.nome" required />
  <bth-button type="submit" color="primary" ng-attr-disabled="{{ vm.form.$invalid || undefined }}">Salvar</bth-button>
  <bth-button type="reset" variant="ghost">Limpar</bth-button>
</form>
```

O bth-ui ainda não tem componentes de campo (input, select, checkbox). Use os elementos nativos ou os da aplicação para os campos, com `ng-model` neles.
