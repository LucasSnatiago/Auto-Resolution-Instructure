# 🎬 Instructure Video Auto-Resolution

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.2-blue)
![Chrome](https://img.shields.io/badge/chrome-MV3-yellow?logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/firefox-MV3-orange?logo=firefox&logoColor=white)

> Força a resolução máxima nos vídeos do Canvas/Instructure Studio — automaticamente, sem clique nenhum.

---

<!-- TODO: adicionar screenshot ou GIF do popup aqui -->
<!-- Sugestão: gravar um GIF curto mostrando o popup com o toggle e seleção de resolução -->
<!-- ![Popup da extensão](assets/popup-screenshot.png) -->

---

## Por que isso existe?

O Canvas Studio escolhe qualidades baixas por padrão, mesmo com conexão boa. Esta extensão detecta o player e seleciona a resolução que você configurou assim que o vídeo carrega.

---

## Funcionalidades

- **Auto-seleção** de resolução ao carregar o vídeo
- **Configurável** — Auto, 1080p, 720p ou 480p
- **Toggle rápido** — ative/desative sem remover a extensão
- **Suporte a iframes** — funciona em players embutidos
- **Chrome + Firefox** — Manifest V3

---

## Instalação

### Chrome

1. Clone ou baixe este repositório
2. `chrome://extensions` → ative **Modo do desenvolvedor**
3. **Carregar sem compactação** → selecione a pasta do projeto

### Firefox

1. Clone ou baixe este repositório
2. `about:debugging#/runtime/this-firefox`
3. **Carregar extensão temporária** → selecione `manifest.json`

---

## Uso

Funciona automaticamente após instalar. Clique no ícone da extensão para:

- Ativar/desativar a troca automática
- Escolher a resolução preferida

Configurações salvas localmente e persistem entre sessões.

---

## Como funciona

O Canvas Studio usa [Video.js](https://videojs.com/) + `videojs-contrib-quality-menu`. A extensão usa três estratégias em cascata:

1. **API Video.js** — `player.qualityLevels()` → habilita o level desejado
2. **DOM Clicks** (fallback) — simula cliques no menu de qualidade
3. **MutationObserver** (último recurso) — aguarda player carregar dinamicamente

---

## Build

```bash
make  # Gera instructure-video-fix.zip
```

---

## Estrutura

```
├── manifest.json   # Manifest V3 (Chrome + Firefox)
├── content.js      # Script injetado nas páginas
├── popup.html/css/js  # Interface do popup
├── Makefile        # Build → zip
└── LICENSE         # MIT
```

---

## Debug

DevTools (F12) → Console. Logs com prefixo: `Instructure Auto-Resolution: ...`

---

## Licença

[MIT](LICENSE)
