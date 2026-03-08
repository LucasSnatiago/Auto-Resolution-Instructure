// content.js
console.log("Instructure Auto-Resolution: Script iniciado no iframe.");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attemptResolutionChange() {
  // 1. Encontra a engrenagem
  const settingsBtn = document.querySelector('button.controls-button[aria-label="Settings"]');
  if (!settingsBtn) return false; // Player não carregou

  settingsBtn.click();
  await sleep(300); // Aguarda animação

  // 2. Encontra o botão "Quality"
  const menuItems = document.querySelectorAll('button[role="menuitem"]');
  const qualityBtn = Array.from(menuItems).find(btn => btn.textContent.includes('Quality'));

  if (!qualityBtn) {
    settingsBtn.click(); // Fecha o menu
    return true;
  }

  qualityBtn.click();
  await sleep(300); // Aguarda submenu abrir

  // 3. Busca as resoluções
  const radioItems = Array.from(document.querySelectorAll('button[role="menuitemradio"]'));

  // Tenta achar o 1080p primeiro
  let targetResolutionBtn = radioItems.find(btn => btn.textContent.includes('1080p'));
  let targetName = '1080p';

  // PLANO B: Se não achou 1080p, tenta 720p
  if (!targetResolutionBtn) {
    targetResolutionBtn = radioItems.find(btn => btn.textContent.includes('720p'));
    targetName = '720p';
  }

  // Se achou alguma das resoluções desejadas
  if (targetResolutionBtn) {
    if (targetResolutionBtn.getAttribute('aria-checked') === 'false') {
      targetResolutionBtn.click();
      console.log(`Instructure Auto-Resolution: Alterado para ${targetName} com sucesso!`);
    } else {
      console.log(`Instructure Auto-Resolution: O vídeo já estava na melhor qualidade (${targetName}).`);
    }
  } else {
    console.log("Instructure Auto-Resolution: Nenhuma opção em HD (1080p ou 720p) encontrada.");
  }

  settingsBtn.click(); // Fecha menu
  return true; // Fluxo concluído
}

async function init() {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const foundPlayer = await attemptResolutionChange();
    if (foundPlayer) {
      break;
    }
    attempts++;
    await sleep(1000);
  }

  if (attempts >= maxAttempts) {
    console.log("Instructure Auto-Resolution: Player não encontrado ou demorou demais.");
  }
}

init();
