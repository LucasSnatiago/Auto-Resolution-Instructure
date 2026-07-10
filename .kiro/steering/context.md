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

- `*.instructure.com`
- `*.instructuremedia.com`

## Configurações (chrome.storage.local)

- `enabled` (boolean, default: true) — ativa/desativa a extensão
- `resolution` (string, default: "1080p") — resolução alvo

## Estratégia de Funcionamento (content.js v1.2)

1. **API do Video.js** (principal): Injeta script na página que acessa `player.qualityLevels()` diretamente e habilita apenas o level desejado.
2. **DOM clicks** (fallback): Clica nos elementos do menu de qualidade usando seletores atualizados.
3. **MutationObserver** (último recurso): Observa o DOM esperando o player carregar dinamicamente.

## Histórico de Problemas

- **v1.1**: Extensão parou de funcionar porque o Instructure migrou de um menu genérico de "Settings" (com submenu "Quality") para o plugin `videojs-contrib-quality-menu` que usa botão direto de qualidade com classes/estrutura diferentes.
- **v1.2**: Reescrita completa do content.js com múltiplas estratégias e seletores atualizados.

## Build

```bash
make  # Gera instructure-video-fix.zip
```

## Como Testar

1. Carregar extensão descompactada no navegador (chrome://extensions ou about:debugging)
2. Acessar uma página com vídeo em `*.instructure.com` ou `*.instructuremedia.com`
3. Abrir DevTools (F12) → Console para ver logs com prefixo "Instructure Auto-Resolution:"
