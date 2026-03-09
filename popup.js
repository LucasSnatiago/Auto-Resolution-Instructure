// popup.js
const toggleAuto = document.getElementById('toggle-auto');
const resRadios = document.getElementsByName('res');
const statusMsg = document.getElementById('status-msg');

function showStatus() {
  statusMsg.classList.add('show');
  setTimeout(() => statusMsg.classList.remove('show'), 1500);
}

// Carrega configurações salvas
chrome.storage.local.get(['enabled', 'resolution'], (data) => {
  toggleAuto.checked = data.enabled !== false; // Default true
  
  if (data.resolution) {
    const radio = Array.from(resRadios).find(r => r.value === data.resolution);
    if (radio) radio.checked = true;
  }
});

// Salva Toggle
toggleAuto.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: toggleAuto.checked }, showStatus);
});

// Salva Resolução
resRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      chrome.storage.local.set({ resolution: radio.value }, showStatus);
    }
  });
});
