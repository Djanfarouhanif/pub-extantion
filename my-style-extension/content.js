/**
 * content.js
 * Script injecté sur les pages cibles.
 * Version dynamique : Charge la configuration depuis le storage.
 */

// --- ÉTAT ---

let activeRules = [];

// --- LOGIQUE ---

/**
 * Applique les règles de style sur un nœud racine et ses enfants.
 * @param {Node} root - Le nœud à analyser (document ou un élément ajouté).
 */
function applyStyles(root = document) {
  if (activeRules.length === 0) return;

  activeRules.forEach(rule => {
    // 1. Sur l'élément lui-même
    if (root instanceof Element && root.matches(rule.selector)) {
      if (!root.classList.contains(rule.addClass)) {
        root.classList.add(rule.addClass);
      }
    }

    // 2. Sur les descendants
    if (root instanceof Element || root instanceof Document) {
      // try/catch pour éviter de planter sur des sélecteurs invalides
      try {
        const elements = root.querySelectorAll(rule.selector);
        elements.forEach(el => {
          if (!el.classList.contains(rule.addClass)) {
              el.classList.add(rule.addClass);
          }
        });
      } catch (e) {
        // console.warn('Sélecteur invalide:', rule.selector);
      }
    }
  });
}

/**
 * Injecte ou met à jour le CSS personnalisé dans le HEAD
 */
function injectCustomCSS(cssContent) {
  const styleId = 'my-style-extension-custom-css';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl); // Ou document.documentElement si head absent
  }

  styleEl.textContent = cssContent || '';
}


// --- INITIALISATION & STORAGE ---

function init() {
  // 1. Charger la config initiale
  chrome.storage.local.get(['rules', 'customCSS'], (result) => {
    activeRules = result.rules || [];
    const customCSS = result.customCSS || '';

    // Injecter CSS
    injectCustomCSS(customCSS);

    // Appliquer règles initiales
    applyStyles(document);

    // Lancer l'observer une fois la config chargée pour éviter de travailler pour rien
    observeDOM();
  });
}

// 2. Écouter les changements de configuration (Temps réel)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.rules) {
      activeRules = changes.rules.newValue || [];
      // Ré-appliquer immédiatement sur tout le document
      applyStyles(document);
    }

    if (changes.customCSS) {
      injectCustomCSS(changes.customCSS.newValue);
    }
  }
});

// --- OBSERVATION (SPA / Dynamique) ---

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyStyles(node);
        }
      });
    }
  });
});

const observeDOM = () => {
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        requestAnimationFrame(observeDOM);
    }
};

// Démarrer tout
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
