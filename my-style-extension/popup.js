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

// État local
let rules = [];

// --- CHARGEMENT ---

// Charger la configuration au démarrage
function loadConfig() {
  chrome.storage.local.get(['rules', 'customCSS'], (result) => {
    // Charger les règles
    rules = result.rules || [];
    renderRules();

    // Charger le CSS
    cssEditor.value = result.customCSS || '';
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
      <button class="delete-btn" data-index="${index}">✖</button>
    `;

    rulesList.appendChild(li);
  });

  // Ajouter les écouteurs sur les boutons de suppression
  document.querySelectorAll('.delete-btn').forEach(btn => {
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

// Sauvegarder les règles dans le storage
function saveRules() {
  chrome.storage.local.set({ rules: rules }, () => {
    renderRules();
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
