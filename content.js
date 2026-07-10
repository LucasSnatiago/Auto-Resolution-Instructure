// content.js
console.log("Instructure Auto-Resolution: Iniciado em " + window.location.href);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Estratégia 1: Usar a API JavaScript do Video.js diretamente
 * Isso é mais confiável que clicar em elementos do DOM.
 * Injeta um script na página para acessar o player videojs.
 */
function injectPlayerScript(targetRes) {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const targetRes = "${targetRes}";
      const targetHeight = parseInt(targetRes) || 1080;

      function setQuality() {
        // Tenta achar o player video.js
        const players = window.videojs && window.videojs.getAllPlayers
          ? window.videojs.getAllPlayers()
          : [];

        // Também tenta por ID do elemento video
        const videoElements = document.querySelectorAll('.video-js, [data-player]');
        
        let player = players[0];
        
        if (!player && videoElements.length > 0) {
          const el = videoElements[0];
          const id = el.id || el.getAttribute('data-player');
          if (id && window.videojs) {
            try { player = window.videojs(id); } catch(e) {}
          }
        }

        if (!player) return false;

        // Verifica se qualityLevels está disponível
        const qualityLevels = player.qualityLevels && player.qualityLevels();
        if (!qualityLevels || qualityLevels.length === 0) return false;

        console.log("Instructure Auto-Resolution [injected]: Encontrado " + qualityLevels.length + " quality levels");

        // Lista os levels disponíveis
        const levels = [];
        for (let i = 0; i < qualityLevels.length; i++) {
          levels.push({
            index: i,
            height: qualityLevels[i].height,
            bitrate: qualityLevels[i].bitrate,
            enabled: qualityLevels[i].enabled
          });
        }
        console.log("Instructure Auto-Resolution [injected]: Levels:", JSON.stringify(levels));

        // Encontra o level mais próximo do target
        let bestIndex = -1;
        let bestHeight = 0;
        let fallbackIndex = -1;
        let fallbackHeight = 0;

        for (let i = 0; i < qualityLevels.length; i++) {
          const h = qualityLevels[i].height;
          if (h === targetHeight) {
            bestIndex = i;
            bestHeight = h;
            break;
          }
          // Fallback: a maior resolução disponível abaixo do target
          if (h > fallbackHeight) {
            fallbackHeight = h;
            fallbackIndex = i;
          }
        }

        const selectedIndex = bestIndex !== -1 ? bestIndex : fallbackIndex;
        if (selectedIndex === -1) return false;

        const selectedHeight = bestIndex !== -1 ? bestHeight : fallbackHeight;

        // Desabilita todos os levels exceto o desejado
        for (let i = 0; i < qualityLevels.length; i++) {
          qualityLevels[i].enabled = (i === selectedIndex);
        }

        console.log("Instructure Auto-Resolution [injected]: Qualidade ajustada para " + selectedHeight + "p");

        // Dispara evento customizado para o content script saber que deu certo
        document.dispatchEvent(new CustomEvent('ires-quality-set', { detail: { height: selectedHeight } }));
        return true;
      }

      // Tenta imediatamente e depois com retry
      if (!setQuality()) {
        let attempts = 0;
        const interval = setInterval(function() {
          attempts++;
          if (setQuality() || attempts > 30) {
            clearInterval(interval);
            if (attempts > 30) {
              console.log("Instructure Auto-Resolution [injected]: Timeout - player não encontrado via API");
            }
          }
        }, 1000);
      }
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

/**
 * Estratégia 2: Clicar nos elementos do DOM (fallback)
 * Usa seletores atualizados para o videojs-contrib-quality-menu
 */
async function attemptResolutionChangeDOM(targetRes) {
  // O videojs-contrib-quality-menu cria um botão direto de qualidade
  // Seletores possíveis para o botão de qualidade:
  const qualityBtn = document.querySelector([
    '.vjs-quality-menu-button',                          // Classe principal do plugin
    'button[aria-label="Quality Levels"]',               // aria-label do plugin
    'button[aria-label*="Quality"]',                     // aria-label parcial
    '.vjs-quality-menu-wrapper .vjs-menu-button',        // Dentro do wrapper
    '.vjs-icon-cog',                                     // Ícone de engrenagem (fallback)
    'button.vjs-menu-button[title*="Quality"]',          // title attribute
    // Seletores antigos como fallback extra:
    'button.controls-button[aria-label*="Sett"]',
    'button.controls-button[aria-label*="Config"]',
    '.vjs-settings-control',
    '[title*="Settings"]'
  ].join(', '));

  if (!qualityBtn) return false;

  console.log("Instructure Auto-Resolution: Botão encontrado!", qualityBtn.className);

  // Se é um menu button do video.js, o menu já pode estar visível ao hover
  // Vamos clicar para abrir
  qualityBtn.click();
  await sleep(400);

  // Procura items do menu de qualidade
  // O videojs-contrib-quality-menu usa .vjs-menu-item com aria-checked
  const menuItems = document.querySelectorAll([
    '.vjs-quality-menu-wrapper .vjs-menu-item',
    '.vjs-quality-menu-button + .vjs-menu .vjs-menu-item',
    '.vjs-menu-button.vjs-quality-menu-button .vjs-menu .vjs-menu-item',
    // Menu genérico do video.js 
    '.vjs-menu.vjs-lock-showing .vjs-menu-item',
    // Seletores mais antigos
    '[role="menuitemradio"]',
    '.vjs-menu-item'
  ].join(', '));

  if (menuItems.length === 0) {
    // Talvez precise navegar para submenu "Quality" primeiro (players antigos)
    const allElements = Array.from(document.querySelectorAll('.vjs-menu-item, button, li, span'));
    const qualitySubmenu = allElements.find(el => {
      const txt = el.textContent.trim().toLowerCase();
      return (txt === 'quality' || txt === 'qualidade' || txt === 'quality levels') && el.offsetParent !== null;
    });

    if (qualitySubmenu) {
      qualitySubmenu.click();
      await sleep(400);
    } else {
      qualityBtn.click(); // Fecha
      return false;
    }
  }

  // Re-busca após possível submenu
  const options = Array.from(document.querySelectorAll([
    '.vjs-quality-menu-wrapper .vjs-menu-item',
    '.vjs-menu.vjs-lock-showing .vjs-menu-item',
    '[role="menuitemradio"]',
    '.vjs-menu-item'
  ].join(', '))).filter(el => el.offsetParent !== null); // Só visíveis

  console.log("Instructure Auto-Resolution: Opções:", options.map(o => o.textContent.trim()));

  const targetHeight = parseInt(targetRes) || 1080;
  
  // Tenta encontrar a resolução alvo
  let targetBtn = options.find(opt => {
    const text = opt.textContent.trim().toLowerCase();
    return text.includes(targetRes.toLowerCase()) || text.includes(targetHeight + 'p');
  });

  // Fallback: 720p se 1080p não existe
  if (!targetBtn && targetHeight >= 1080) {
    targetBtn = options.find(opt => opt.textContent.toLowerCase().includes('720p'));
  }

  // Fallback: HD se não encontrou por resolução
  if (!targetBtn && targetHeight >= 720) {
    targetBtn = options.find(opt => {
      const text = opt.textContent.trim().toLowerCase();
      return text === 'hd' || text.includes('high');
    });
  }

  if (targetBtn) {
    const isSelected = targetBtn.getAttribute('aria-checked') === 'true' ||
                       targetBtn.classList.contains('vjs-selected');
    if (!isSelected) {
      targetBtn.click();
      console.log(`Instructure Auto-Resolution: QUALIDADE AJUSTADA PARA ${targetBtn.textContent.trim()}!`);
    } else {
      console.log("Instructure Auto-Resolution: Já está na qualidade desejada.");
    }
    return true;
  }

  // Não encontrou - fecha o menu
  qualityBtn.click();
  return false;
}

/**
 * Observa o DOM para detectar quando o player é carregado dinamicamente
 */
function observePlayer(callback) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Detecta quando um player video.js é adicionado
        if (node.classList && (
          node.classList.contains('video-js') ||
          node.classList.contains('vjs-quality-menu-wrapper') ||
          node.querySelector && node.querySelector('.video-js, .vjs-quality-menu-button')
        )) {
          observer.disconnect();
          callback();
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Safety timeout - para de observar após 2 minutos
  setTimeout(() => observer.disconnect(), 120000);
  
  return observer;
}

async function init() {
  chrome.storage.local.get(['enabled', 'resolution'], async (data) => {
    const isEnabled = data.enabled !== false;
    const targetRes = data.resolution || '1080p';

    if (!isEnabled) {
      console.log("Instructure Auto-Resolution: Desativado no popup.");
      return;
    }

    console.log(`Instructure Auto-Resolution: Buscando player (Alvo: ${targetRes})...`);

    let resolved = false;

    // Listener para o evento do script injetado
    document.addEventListener('ires-quality-set', (e) => {
      resolved = true;
      console.log(`Instructure Auto-Resolution: Sucesso via API! (${e.detail.height}p)`);
    });

    // Estratégia 1: Espera um pouco e tenta via API JavaScript (mais confiável)
    await sleep(2000);
    injectPlayerScript(targetRes);

    // Espera um pouco para ver se a Estratégia 1 funcionou
    await sleep(3000);

    if (resolved) return;

    // Estratégia 2: Tenta via DOM clicks (fallback)
    console.log("Instructure Auto-Resolution: API não funcionou, tentando via DOM...");
    
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts && !resolved) {
      const success = await attemptResolutionChangeDOM(targetRes);
      if (success) {
        resolved = true;
        console.log("Instructure Auto-Resolution: Sucesso via DOM!");
        break;
      }
      attempts++;
      await sleep(1500);
    }

    if (!resolved) {
      // Estratégia 3: Observa o DOM caso o player ainda não tenha carregado
      console.log("Instructure Auto-Resolution: Player não encontrado, observando DOM...");
      observePlayer(async () => {
        console.log("Instructure Auto-Resolution: Player detectado via MutationObserver!");
        await sleep(1500);
        injectPlayerScript(targetRes);
        await sleep(3000);
        if (!resolved) {
          // Último fallback via DOM
          for (let i = 0; i < 10; i++) {
            const success = await attemptResolutionChangeDOM(targetRes);
            if (success) break;
            await sleep(1500);
          }
        }
      });
    }
  });
}

// Inicia quando o DOM estiver pronto ou imediatamente se já estiver
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
