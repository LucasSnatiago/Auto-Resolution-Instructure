# Contexto do Projeto: Auto-Resolution Instructure

## Visão Geral

Extensão de navegador (Chrome/Firefox) que automaticamente seleciona a maior resolução disponível (padrão 1080p) nos players de vídeo do Instructure/Canvas Studio.

## Stack Técnica

- **Tipo**: Extensão de navegador (Manifest V3)
- **Linguagem**: JavaScript vanilla
- **Compatibilidade**: Chrome + Firefox (via `browser_specific_settings.gecko`)
- **ID Firefox**: `instructure-video-fix@lucassnatiago.com.br`

## Estrutura de Arquivos

```
├── manifest.json       # Manifest V3, permissões: activeTab, storage
├── content.js          # Script principal injetado nas páginas do Instructure
├── popup.html          # Interface do popup da extensão
├── popup.css           # Estilos do popup
├── popup.js            # Lógica do popup (toggle on/off, seleção de resolução)
├── Makefile            # Build (zip da extensão)
├── LICENSE             # Licença do projeto
└── README.md           # Documentação básica
```

## Player de Vídeo do Instructure

O Canvas Studio usa **Video.js** com o plugin **videojs-contrib-quality-menu**.

### Arquitetura da Página

A página do Canvas (`*.instructure.com`) embute o player de vídeo via **iframe** apontando para `*.instructuremedia.com`. O content script roda em ambos os frames (`all_frames: true`), mas deve atuar **apenas dentro do iframe** do player.

URL típica do iframe do player:
```
https://pucminas.instructuremedia.com/lti/launch?custom_arc_launch_type=bare_embed&custom_arc_media_id=...
```

### Seletores CSS Relevantes

- Botão de qualidade: `.vjs-quality-menu-button`
- Wrapper: `.vjs-quality-menu-wrapper`
- Ícone: `.vjs-icon-cog`
- Items do menu: `.vjs-menu-item` com `aria-checked`
- Atributos: `aria-label="Quality Levels"`
- Classe de seleção: `.vjs-selected`

### API JavaScript

- `videojs.getAllPlayers()` — lista todos os players
- `player.qualityLevels()` — retorna QualityLevelList
- `qualityLevels[i].height` — resolução vertical (720, 1080, etc.)
- `qualityLevels[i].enabled = true/false` — habilita/desabilita um level
- `qualityLevels.selectedIndex` — índice atualmente selecionado

## Domínios Alvo

- `*.instructure.com` (página principal do Canvas — NÃO contém o player diretamente)
- `*.instructuremedia.com` (iframe do player — aqui roda o Video.js)

## Configurações (chrome.storage.local)

- `enabled` (boolean, default: true) — ativa/desativa a extensão
- `resolution` (string, default: "1080p") — resolução alvo

## Estratégia de Funcionamento (content.js v1.3)

O script é envolto numa IIFE e executa **apenas no frame do player** (`instructuremedia.com`). Sai silenciosamente no frame pai.

1. **Guard de frame**: Verifica `window.location.hostname.includes("instructuremedia.com")`. Se não, faz `return` imediato.
2. **API do Video.js** (principal): Injeta script na página que acessa `player.qualityLevels()` diretamente e habilita apenas o level desejado. Retry: 20 tentativas × 1.5s (30s total).
3. **DOM clicks** (fallback, **única tentativa**): Só executa se a API falhar completamente (evento `ires-api-failed`). Abre menu, tenta selecionar, fecha menu. Sem loop.
4. **MutationObserver**: Usado apenas se nenhum elemento de player for encontrado nos primeiros 2s. Timeout de 60s.

### Comunicação entre scripts

- O script injetado na página dispara `CustomEvent("ires-quality-set")` em caso de sucesso.
- O script injetado dispara `CustomEvent("ires-api-failed")` se não conseguir após 20 tentativas.
- O content script escuta esses eventos para decidir se precisa do fallback DOM.

## Histórico de Problemas

- **v1.1**: Extensão parou de funcionar porque o Instructure migrou de um menu genérico de "Settings" (com submenu "Quality") para o plugin `videojs-contrib-quality-menu` que usa botão direto de qualidade com classes/estrutura diferentes.
- **v1.2**: Reescrita completa do content.js com múltiplas estratégias e seletores atualizados.
- **v1.3**: Bug fix — o script rodava em ambos os frames e o fallback DOM fazia loop de 30 tentativas abrindo/fechando a engrenagem repetidamente. Fix: guard de frame para rodar só no iframe do player + fallback DOM limitado a uma única tentativa.

### Causa raiz do bug v1.2 → v1.3

O `content.js` rodava tanto no frame pai (`instructure.com`, sem player) quanto no iframe (`instructuremedia.com`, com player). No frame pai, a API sempre falhava e caía no fallback DOM que fazia **30 tentativas** de click no botão de qualidade — abrindo e fechando a engrenagem repetidamente por ~45 segundos.

## Build

```bash
make  # Gera instructure-video-fix.zip
```

## Como Testar

1. Carregar extensão descompactada no navegador (chrome://extensions ou about:debugging)
2. Acessar uma página com vídeo em `*.instructure.com` ou `*.instructuremedia.com`
3. Abrir DevTools (F12) → Console para ver logs com prefixo "Instructure Auto-Resolution:"
4. **Importante**: Selecionar o frame correto no DevTools (dropdown no topo do Console) para ver logs do iframe do player
