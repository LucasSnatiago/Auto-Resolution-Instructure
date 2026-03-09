// content.js
console.log("Instructure Auto-Resolution: Iniciado em " + window.location.href);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attemptResolutionChange(targetRes) {
  // 1. Procura o botão de engrenagem de forma mais ampla
  // O Canvas Studio usa seletores variados, tentamos os mais comuns
  const settingsBtn = document.querySelector('button.controls-button[aria-label*="Sett"], button.controls-button[aria-label*="Config"], .vjs-settings-control, [title*="Settings"]');

  if (!settingsBtn) return false;

  console.log("Instructure Auto-Resolution: Botão de configurações encontrado!");
  settingsBtn.click();
  await sleep(300); // Espera o menu abrir

  // 2. Procura a opção "Quality" ou "Qualidade"
  // Buscamos em botões, spans e divs dentro do menu aberto
  const allElements = Array.from(document.querySelectorAll('button, span, div, li'));
  const qualityBtn = allElements.find(el => {
    const txt = el.textContent.trim().toLowerCase();
    return (txt === 'quality' || txt === 'qualidade') && el.offsetParent !== null;
  });

  if (!qualityBtn) {
    console.log("Instructure Auto-Resolution: Opção 'Qualidade' não vista. Menu pode estar carregando...");
    // Não fecha o menu aqui, tenta clicar no que achou ou espera a próxima volta
    if (document.body.innerText.toLowerCase().includes('quality') || document.body.innerText.toLowerCase().includes('qualidade')) {
       // Se o texto existe mas o botão não foi mapeado, tentamos um clique genérico no texto
       qualityBtn?.click();
    } else {
       settingsBtn.click(); // Reset
       return false;
    }
  } else {
    qualityBtn.click();
  }

  await sleep(300);

  // 3. Seleciona a resolução
  const options = Array.from(document.querySelectorAll('[role="menuitemradio"], .vjs-menu-item'));
  console.log("Instructure Auto-Resolution: Opções de qualidade:", options.map(o => o.textContent.trim()));

  let targetBtn = options.find(opt => opt.textContent.toLowerCase().includes(targetRes.toLowerCase()));

  // Fallback para 720p se 1080p não existir e não for "Auto"
  if (!targetBtn && targetRes === '1080p') {
    targetBtn = options.find(opt => opt.textContent.toLowerCase().includes('720p'));
  }

  if (targetBtn) {
    const isSelected = targetBtn.getAttribute('aria-checked') === 'true' || targetBtn.classList.contains('vjs-selected');
    if (!isSelected) {
      targetBtn.click();
      console.log(`Instructure Auto-Resolution: QUALIDADE AJUSTADA PARA ${targetBtn.textContent.trim()}!`);
    } else {
      console.log("Instructure Auto-Resolution: Já está na qualidade máxima.");
    }
    settingsBtn.click(); // Fecha o menu
    return true;
  }

  // Se chegou aqui e não achou a opção, fecha para resetar
  settingsBtn.click();
  return false;
}

async function init() {
  // Pequeno delay inicial para estabilizar o carregamento do iframe
  await sleep(1500);

  chrome.storage.local.get(['enabled', 'resolution'], async (data) => {
    const isEnabled = data.enabled !== false;
    const targetRes = data.resolution || '1080p';

    if (!isEnabled) {
      console.log("Instructure Auto-Resolution: Desativado no popup.");
      return;
    }

    console.log(`Instructure Auto-Resolution: Buscando player (Alvo: ${targetRes})...`);

    let attempts = 0;
    const maxAttempts = 40; // 1 minuto de tentativas

    while (attempts < maxAttempts) {
      const success = await attemptResolutionChange(targetRes);
      if (success) {
        console.log("Instructure Auto-Resolution: Sucesso!");
        break;
      }
      attempts++;
      await sleep(1000); // Espera 1s entre tentativas
    }
  });
}

// Inicia o script
init();
