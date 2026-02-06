/**
 * content.js
 * Script injecté sur les pages cibles.
 * Version dynamique + Whitelist.
 */

// --- ÉTAT ---
let activeRules = [];
let isAllowed = false;

// --- LOGIQUE ---

function applyStyles(root = document) {
  if (!isAllowed || activeRules.length === 0) return;

  activeRules.forEach(rule => {
    if (root instanceof Element && root.matches(rule.selector)) {
      if (!root.classList.contains(rule.addClass)) {
        root.classList.add(rule.addClass);
      }
    }

    if (root instanceof Element || root instanceof Document) {
      try {
        const elements = root.querySelectorAll(rule.selector);
        elements.forEach(el => {
          if (!el.classList.contains(rule.addClass)) {
              el.classList.add(rule.addClass);
          }
        });
      } catch (e) { }
    }
  });
}

function injectCustomCSS(cssContent) {
  if (!isAllowed) return; // Sécurité supplémentaire

  const styleId = 'my-style-extension-custom-css';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = cssContent || '';
}

// --- VÉRIFICATION DOMAINE ---

function checkDomainAllowed(allowedDomains) {
    if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
        return false; // Pas de whitelist définie = bloquer tout
    }
    const hostname = window.location.hostname;
    // Vérifie si le hostname actuel contient un des domaines autorisés
    // Ex: "www.google.com" contient "google.com"
    return allowedDomains.some(domain => hostname.includes(domain));
}


// --- INITIALISATION & STORAGE ---

function init() {
  chrome.storage.local.get(['rules', 'customCSS', 'allowedDomains'], (result) => {
    const allowedDomains = result.allowedDomains || [];
    isAllowed = checkDomainAllowed(allowedDomains);

    if (!isAllowed) {
        // console.log('[My Style Extension] Domaine non autorisé:', window.location.hostname);
        return; // ON ARRÊTE TOUT ICI
    }

    // console.log('[My Style Extension] Activé sur:', window.location.hostname);

    activeRules = result.rules || [];
    const customCSS = result.customCSS || '';

    injectCustomCSS(customCSS);
    applyStyles(document);
    observeDOM();
  });
}

// Écouter les changements (pour activation/désactivation dynamique)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Si la liste des domaines change, on doit re-vérifier si on est autorisé
    // Pour simplifier : on recharge la page si le statut change, OU on recharge la config
    // Ici, on recharge la config
    if (changes.allowedDomains) {
        const newAllowed = checkDomainAllowed(changes.allowedDomains.newValue);
        if (newAllowed !== isAllowed) {
             // Changement d'état majeur -> rechargement simple de la config
             window.location.reload();
             return;
        }
    }

    if (!isAllowed) return; // Si toujours interdit, on ignore le reste

    if (changes.rules) {
      activeRules = changes.rules.newValue || [];
      applyStyles(document);
    }

    if (changes.customCSS) {
      injectCustomCSS(changes.customCSS.newValue);
    }
  }
});

// --- OBSERVATION (SPA / Dynamique) ---

const observer = new MutationObserver((mutations) => {
  if (!isAllowed) return; // Ne rien faire si non autorisé

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
    // On ne lance l'observer que si autorisé (vérifié dans init)
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        requestAnimationFrame(observeDOM);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
