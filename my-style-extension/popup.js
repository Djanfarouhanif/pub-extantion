/**
 * popup.js
 * Gère l'interface de configuration de l'extension.
 */

// Éléments du DOM
const selectorInput = document.getElementById('selector-input');
const classInput = document.getElementById('class-input');
const addBtn = document.getElementById('add-btn');
const rulesList = document.getElementById('rules-list');
const cssEditor = document.getElementById('css-editor');
const saveCssBtn = document.getElementById('save-css-btn');
const saveMsg = document.getElementById('save-msg');

const addCurrentSiteBtn = document.getElementById('add-current-site-btn');
const domainsList = document.getElementById('domains-list');

// État local
let rules = [];
let allowedDomains = [];

// Désactiver le bouton tant que ce n'est pas chargé pour éviter d'écraser les données
addBtn.disabled = true;
addBtn.textContent = 'Chargement...';

// --- CHARGEMENT ---

// Charger la configuration au démarrage
function loadConfig() {
  chrome.storage.local.get(['rules', 'customCSS', 'allowedDomains'], (result) => {
    // S'assurer que rules est bien un tableau
    if (Array.isArray(result.rules)) {
      rules = result.rules;
    } else {
      rules = [];
    }

    if (Array.isArray(result.allowedDomains)) {
        allowedDomains = result.allowedDomains;
    } else {
        allowedDomains = [];
    }

    renderRules();
    renderDomains();

    // Charger le CSS
    cssEditor.value = result.customCSS || '';

    // Activer l'interface
    addBtn.disabled = false;
    addBtn.textContent = 'Ajouter';
  });
}

// Initialiser
document.addEventListener('DOMContentLoaded', loadConfig);

// --- GESTION DES RÈGLES ---

// Afficher la liste des règles
function renderRules() {
  rulesList.innerHTML = '';
  rules.forEach((rule, index) => {
    const li = document.createElement('li');
    li.className = 'rule-item';

    li.innerHTML = `
      <div class="rule-desc">
        <span class="rule-selector">${escapeHtml(rule.selector)}</span>
        <span class="rule-class">.${escapeHtml(rule.addClass)}</span>
      </div>
      <button class="delete-btn rule-delete" data-index="${index}">✖</button>
    `;

    rulesList.appendChild(li);
  });

  // Ajouter les écouteurs sur les boutons de suppression
  document.querySelectorAll('.rule-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteRule(index);
    });
  });
}

// Ajouter une règle
addBtn.addEventListener('click', () => {
  const selector = selectorInput.value.trim();
  const addClass = classInput.value.trim();

  if (selector && addClass) {
    rules.push({ selector, addClass });
    saveRules();
    selectorInput.value = '';
    classInput.value = '';
  }
});

// Supprimer une règle
function deleteRule(index) {
  rules.splice(index, 1);
  saveRules();
}

// Sauvegarder les règles
function saveRules() {
  chrome.storage.local.set({ rules: rules }, () => {
    renderRules();
  });
}

// --- GESTION DES DOMAINES ---

function renderDomains() {
    domainsList.innerHTML = '';
    if (allowedDomains.length === 0) {
        domainsList.innerHTML = '<li style="padding:10px; color:#777; font-style:italic; font-size:12px;">Aucun site autorisé. L\'extension est inactive.</li>';
        return;
    }

    allowedDomains.forEach((domain, index) => {
        const li = document.createElement('li');
        li.className = 'rule-item';
        li.innerHTML = `
            <div class="rule-desc">
                <span class="rule-selector" style="color:#28a745;">${escapeHtml(domain)}</span>
            </div>
            <button class="delete-btn domain-delete" data-index="${index}">✖</button>
        `;
        domainsList.appendChild(li);
    });

    document.querySelectorAll('.domain-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            allowedDomains.splice(index, 1);
            saveDomains();
        });
    });
}

// Ajouter le site courant
addCurrentSiteBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
            try {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname;

                if (!allowedDomains.includes(hostname)) {
                    allowedDomains.push(hostname);
                    saveDomains();
                }
            } catch (e) {
                console.error("Impossible de récupérer l'URL", e);
            }
        }
    });
});

function saveDomains() {
    chrome.storage.local.set({ allowedDomains: allowedDomains }, () => {
        renderDomains();
    });
}


// --- GESTION DU CSS ---

// Sauvegarder le CSS
saveCssBtn.addEventListener('click', () => {
  const css = cssEditor.value;
  chrome.storage.local.set({ customCSS: css }, () => {
    // Feedback visuel
    saveMsg.style.display = 'inline';
    setTimeout(() => { saveMsg.style.display = 'none'; }, 2000);
  });
});

// --- UTILITAIRES ---

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
