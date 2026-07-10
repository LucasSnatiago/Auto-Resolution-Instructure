// content.js - v1.3
// Instructure Auto-Resolution Extension
// Automatically selects the best quality level on Canvas Studio videos.

(function () {
  "use strict";

  const LOG_PREFIX = "Instructure Auto-Resolution:";

  /**
   * Only run inside the actual player frame (instructuremedia.com).
   * The parent Canvas page just embeds the player via iframe — no player exists there.
   */
  function isPlayerFrame() {
    return window.location.hostname.includes("instructuremedia.com");
  }

  if (!isPlayerFrame()) {
    // Silently exit in the parent frame — nothing to do here.
    return;
  }

  console.log(`${LOG_PREFIX} Iniciado no frame do player (${window.location.href})`);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Strategy 1 (primary): Use Video.js API directly via injected page script.
   * This is the most reliable method — no DOM clicking needed.
   */
  function injectPlayerScript(targetRes) {
    const script = document.createElement("script");
    script.textContent = `
    (function() {
      const LOG = "Instructure Auto-Resolution [API]:";
      const targetHeight = parseInt("${targetRes}") || 1080;
      let resolved = false;

      function setQuality() {
        if (resolved) return true;

        const players = (window.videojs && window.videojs.getAllPlayers)
          ? window.videojs.getAllPlayers()
          : [];

        let player = players[0];

        // Fallback: try to get player from video-js element
        if (!player) {
          const el = document.querySelector('.video-js, [data-player]');
          if (el) {
            const id = el.id || el.getAttribute('data-player');
            if (id && window.videojs) {
              try { player = window.videojs(id); } catch(e) {}
            }
          }
        }

        if (!player) return false;

        const qualityLevels = player.qualityLevels && player.qualityLevels();
        if (!qualityLevels || qualityLevels.length === 0) return false;

        console.log(LOG, "Encontrado " + qualityLevels.length + " quality levels");

        // Log available levels
        const levels = [];
        for (let i = 0; i < qualityLevels.length; i++) {
          levels.push(qualityLevels[i].height + "p");
        }
        console.log(LOG, "Disponíveis:", levels.join(", "));

        // Find exact match or closest (highest available)
        let bestIndex = -1;
        let bestHeight = 0;
        let highestIndex = 0;
        let highestHeight = 0;

        for (let i = 0; i < qualityLevels.length; i++) {
          const h = qualityLevels[i].height;
          if (h === targetHeight) {
            bestIndex = i;
            bestHeight = h;
            break;
          }
          if (h > highestHeight) {
            highestHeight = h;
            highestIndex = i;
          }
        }

        // Use exact match, or highest available as fallback
        const selectedIndex = bestIndex !== -1 ? bestIndex : highestIndex;
        const selectedHeight = bestIndex !== -1 ? bestHeight : highestHeight;

        if (selectedIndex === -1) return false;

        // Enable only the desired quality level
        for (let i = 0; i < qualityLevels.length; i++) {
          qualityLevels[i].enabled = (i === selectedIndex);
        }

        resolved = true;
        console.log(LOG, "Qualidade ajustada para " + selectedHeight + "p ✓");
        document.dispatchEvent(new CustomEvent("ires-quality-set", { detail: { height: selectedHeight } }));
        return true;
      }

      // Try immediately
      if (setQuality()) return;

      // Retry with interval — player may still be loading
      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(function() {
        attempts++;
        if (setQuality() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (!resolved && attempts >= maxAttempts) {
            console.log(LOG, "Timeout — player ou qualityLevels não disponível via API");
            document.dispatchEvent(new CustomEvent("ires-api-failed"));
          }
        }
      }, 1500);
    })();
  `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  /**
   * Strategy 2 (fallback): Single DOM click attempt.
   * Only runs ONCE if API fails. No loops.
   */
  async function attemptResolutionChangeDOM(targetRes) {
    const targetHeight = parseInt(targetRes) || 1080;

    // Wait a bit for player UI
    await sleep(1000);

    const qualityBtn = document.querySelector(
      [
        ".vjs-quality-menu-button",
        'button[aria-label="Quality Levels"]',
        'button[aria-label*="Quality"]',
        ".vjs-quality-menu-wrapper .vjs-menu-button",
        ".vjs-icon-cog",
      ].join(", ")
    );

    if (!qualityBtn) {
      console.log(`${LOG_PREFIX} Botão de qualidade não encontrado no DOM`);
      return false;
    }

    console.log(`${LOG_PREFIX} Botão encontrado, tentando via DOM...`);

    // Open the quality menu
    qualityBtn.click();
    await sleep(500);

    // Get visible menu items
    const options = Array.from(
      document.querySelectorAll(
        [
          ".vjs-quality-menu-wrapper .vjs-menu-item",
          ".vjs-quality-menu-button .vjs-menu .vjs-menu-item",
          ".vjs-menu.vjs-lock-showing .vjs-menu-item",
          '[role="menuitemradio"]',
        ].join(", ")
      )
    ).filter((el) => el.offsetParent !== null);

    if (options.length === 0) {
      console.log(`${LOG_PREFIX} Menu abriu mas sem opções visíveis`);
      qualityBtn.click(); // Close menu
      return false;
    }

    console.log(
      `${LOG_PREFIX} Opções:`,
      options.map((o) => o.textContent.trim())
    );

    // Find best match
    let targetBtn = options.find((opt) => {
      const text = opt.textContent.trim().toLowerCase();
      return (
        text.includes(targetHeight + "p") ||
        text.includes(targetRes.toLowerCase())
      );
    });

    // Fallback to 720p if target not available
    if (!targetBtn && targetHeight >= 1080) {
      targetBtn = options.find((opt) =>
        opt.textContent.toLowerCase().includes("720p")
      );
    }

    // Fallback to HD
    if (!targetBtn && targetHeight >= 720) {
      targetBtn = options.find((opt) => {
        const text = opt.textContent.trim().toLowerCase();
        return text === "hd" || text.includes("high");
      });
    }

    if (targetBtn) {
      const isSelected =
        targetBtn.getAttribute("aria-checked") === "true" ||
        targetBtn.classList.contains("vjs-selected");

      if (!isSelected) {
        targetBtn.click();
        console.log(
          `${LOG_PREFIX} DOM: Qualidade ajustada para ${targetBtn.textContent.trim()} ✓`
        );
      } else {
        console.log(`${LOG_PREFIX} DOM: Já está na qualidade desejada ✓`);
        qualityBtn.click(); // Close menu
      }
      return true;
    }

    // Didn't find target — close menu and give up
    console.log(`${LOG_PREFIX} Resolução alvo não encontrada nas opções`);
    qualityBtn.click();
    return false;
  }

  /**
   * Main initialization — runs only in the player frame.
   */
  async function init() {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(["enabled", "resolution"], resolve);
    });

    const isEnabled = data.enabled !== false;
    const targetRes = data.resolution || "1080p";

    if (!isEnabled) {
      console.log(`${LOG_PREFIX} Extensão desativada.`);
      return;
    }

    console.log(`${LOG_PREFIX} Alvo: ${targetRes}`);

    let resolved = false;

    // Listen for success event from injected script
    document.addEventListener("ires-quality-set", (e) => {
      resolved = true;
      console.log(`${LOG_PREFIX} Sucesso via API! (${e.detail.height}p)`);
    });

    // Listen for API failure — triggers single DOM fallback attempt
    document.addEventListener("ires-api-failed", async () => {
      if (resolved) return;
      console.log(
        `${LOG_PREFIX} API falhou, tentando fallback DOM (única tentativa)...`
      );
      const success = await attemptResolutionChangeDOM(targetRes);
      if (success) {
        resolved = true;
      } else {
        console.log(
          `${LOG_PREFIX} Falha total — não foi possível ajustar a qualidade.`
        );
      }
    });

    // Wait for page to be somewhat ready before injecting
    await sleep(2000);

    // Check if the page has video player indications
    const hasPlayerIndication =
      document.querySelector(".video-js, video, [data-player], .vjs-tech") ||
      window.location.pathname.includes("lti/launch");

    if (!hasPlayerIndication) {
      console.log(`${LOG_PREFIX} Player ainda não visível, aguardando...`);
      // Use MutationObserver to wait for player to appear
      const observer = new MutationObserver(() => {
        if (resolved) {
          observer.disconnect();
          return;
        }
        const playerEl = document.querySelector(
          ".video-js, video, [data-player]"
        );
        if (playerEl) {
          observer.disconnect();
          console.log(
            `${LOG_PREFIX} Player detectado via observer, injetando API...`
          );
          setTimeout(() => injectPlayerScript(targetRes), 1500);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      // Safety timeout — stop observing after 60s
      setTimeout(() => observer.disconnect(), 60000);
    } else {
      // Player indication found — inject API script
      injectPlayerScript(targetRes);
    }
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
