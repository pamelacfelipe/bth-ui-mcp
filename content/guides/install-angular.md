# Instalação do bth-ui em Angular

O bth-ui é uma biblioteca de web components (Stencil). No Angular ele é usado como custom elements: não há módulo nem wrappers Angular para importar.

## Pré-requisitos

- Node 20 ou superior.
- Angular 18 ou superior.

## 1. Instalar o pacote

```bash
npm install bth-ui
```

## 2. Registrar os componentes

Chame `defineCustomElements` uma vez, antes de iniciar a aplicação, no `src/main.ts`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from 'bth-ui/loader';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

defineCustomElements();

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
```

O loader registra todas as tags `bth-*` e carrega o código de cada componente só quando ele aparece na página.

Importe sempre de `bth-ui/loader`. Caminhos internos do pacote, como `bth-ui/dist/components/...`, não são exportados e falham no build.

## 3. Permitir custom elements nos templates

Todo componente Angular que usa uma tag `bth-*` no template precisa de `CUSTOM_ELEMENTS_SCHEMA`:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-exemplo',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<bth-button color="primary">Salvar</bth-button>`,
})
export class ExemploComponent {}
```

Em projetos com `NgModule`, coloque `schemas: [CUSTOM_ELEMENTS_SCHEMA]` no módulo que declara os componentes.

## 4. Estilos

Não há CSS global para importar: o pacote não publica nenhum arquivo `.css`, e cada componente já carrega o próprio estilo. Não acrescente nada do bth-ui em `styles` no `angular.json`.

## 5. Fontes

O pacote não inclui as fontes. Adicione ao `<head>` do `src/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900" rel="stylesheet">
```

- **Material Symbols Outlined** é obrigatória para o `bth-icon`. Sem ela, o ícone aparece como texto (por exemplo `check_circle`).
- **Geist** é a fonte padrão dos componentes. Sem ela, eles usam a fonte sem serifa do sistema.

Para não depender do Google Fonts, veja a seção de fontes do guia de configuração (`get_setup_guide` com `topic: "fonte"`).

## 6. Verificar

Coloque no template de um componente que tenha o schema do passo 3:

```html
<bth-button color="primary">
  <bth-icon name="check_circle"></bth-icon>
  Salvar
</bth-button>
```

Rode `ng serve` e confira:

- o botão aparece azul, com o texto "Salvar";
- o ícone aparece como um símbolo, não como o texto `check_circle`;
- no console do navegador, `customElements.get('bth-button')` devolve uma classe, não `undefined`.

## Problemas comuns

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Erro `NG8001: 'bth-button' is not a known element` | Falta o schema | Adicione `schemas: [CUSTOM_ELEMENTS_SCHEMA]` ao componente ou módulo (passo 3) |
| A tag aparece no HTML, mas sem estilo e sem comportamento | Os componentes não foram registrados | Chame `defineCustomElements()` no `main.ts` (passo 2) |
| O ícone aparece como texto | A fonte Material Symbols Outlined não carregou | Confira os `<link>` do passo 5 e a aba de rede do navegador |
| O build falha ao importar `bth-ui/dist/...` | Caminho interno não exportado pelo pacote | Importe só de `bth-ui/loader` |
| Um valor de prop é ignorado | O valor não existe para aquela prop | Confira os valores permitidos com `get_component` |
