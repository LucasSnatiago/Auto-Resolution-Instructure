// content.js
console.log("Instructure Auto-Resolution: Script iniciado no iframe.");

// Função auxiliar para criar as pausas entre os cliques
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attemptResolutionChange() {
  // 1. Encontra a engrenagem
  const settingsBtn = document.querySelector('button.controls-button[aria-label="Settings"]');
  if (!settingsBtn) return false; // O player ainda não carregou

  settingsBtn.click();
  await sleep(300); // Aguarda a animação do menu abrir

  // 2. Encontra o botão "Quality"
  const menuItems = document.querySelectorAll('button[role="menuitem"]');
  // Transforma os itens em um Array e busca o que contém a palavra "Quality"
  const qualityBtn = Array.from(menuItems).find(btn => btn.textContent.includes('Quality'));

  if (!qualityBtn) {
    // Se a engrenagem existe mas não há botão "Quality", fechamos o menu e abortamos
    settingsBtn.click();
    return true;
  }

  qualityBtn.click();
  await sleep(300); // Aguarda o submenu de resoluções abrir

  // 3. Encontra a opção "1080p"
  const radioItems = document.querySelectorAll('button[role="menuitemradio"]');
  const targetResolutionBtn = Array.from(radioItems).find(btn => btn.textContent.includes('1080p'));

  if (targetResolutionBtn) {
    if (targetResolutionBtn.getAttribute('aria-checked') === 'false') {
      targetResolutionBtn.click();
      console.log("Instructure Auto-Resolution: Alterado para 1080p com sucesso!");
      settingsBtn.click();
    } else {
      console.log("Instructure Auto-Resolution: O vídeo já estava em 1080p.");
      settingsBtn.click(); // Fecha o menu para não atrapalhar a visão
    }
  } else {
    console.log("Instructure Auto-Resolution: Opção 1080p não encontrada neste vídeo.");
    settingsBtn.click(); // Fecha o menu
  }

  return true; // Encontramos o player e executamos o fluxo completo
}

// Lógica principal com repetição (Polling)
async function init() {
  let attempts = 0;
  const maxAttempts = 20;

  // Fica tentando a cada 1 segundo até o limite de 20 tentativas
  while (attempts < maxAttempts) {
    const foundPlayer = await attemptResolutionChange();
    if (foundPlayer) {
      break; // Sai do loop se executou o fluxo
    }
    attempts++;
    await sleep(1000);
  }

  if (attempts >= maxAttempts) {
    console.log("Instructure Auto-Resolution: Player não encontrado ou demorou demais para carregar.");
  }
}

// Inicia o script
init();
