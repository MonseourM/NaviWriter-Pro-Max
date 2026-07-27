// js/themes.js
// NaviWriter theme system

const NAVI_THEME_KEY = 'naviwriter-theme';
const NAVI_LIGHT_KEY = 'naviwriter-light-mode';

const NAVI_THEMES = [
  'purple',
  'midnight',
  'forest',
  'rose'
];

function clearThemeClasses() {
  NAVI_THEMES.forEach(theme => {
    document.body.classList.remove(`theme-${theme}`);
  });
}

function applyTheme(themeName = 'purple') {
  const safeTheme = NAVI_THEMES.includes(themeName)
    ? themeName
    : 'purple';

  clearThemeClasses();

  document.body.classList.add(`theme-${safeTheme}`);

  const selector = document.getElementById('themeSelect');

  if (selector) {
    selector.value = safeTheme;
  }

  localStorage.setItem(NAVI_THEME_KEY, safeTheme);

  return safeTheme;
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem(NAVI_THEME_KEY) || 'purple';
  return applyTheme(savedTheme);
}

function setLightMode(enabled) {
  const isLight = Boolean(enabled);

  document.body.classList.toggle('light', isLight);
  localStorage.setItem(NAVI_LIGHT_KEY, isLight ? 'true' : 'false');

  updateLightModeButton();

  return isLight;
}

function loadSavedLightMode() {
  const enabled = localStorage.getItem(NAVI_LIGHT_KEY) === 'true';
  return setLightMode(enabled);
}

function toggleLightMode() {
  const enabled = !document.body.classList.contains('light');
  return setLightMode(enabled);
}

function updateLightModeButton() {
  const btn = document.getElementById('lightModeBtn');

  if (!btn) return;

  const isLight = document.body.classList.contains('light');

  btn.textContent = isLight ? 'Dark' : 'Light';
  btn.classList.toggle('active', isLight);
}

function setupThemeControls() {
  const selector = document.getElementById('themeSelect');
  const lightBtn = document.getElementById('lightModeBtn');

  if (selector) {
    selector.onchange = event => {
      applyTheme(event.target.value);
    };
  }

  if (lightBtn) {
    lightBtn.onclick = () => {
      toggleLightMode();
    };
  }

  updateLightModeButton();
}

function initThemes() {
  loadSavedTheme();
  loadSavedLightMode();
  setupThemeControls();
}

window.NaviThemes = {
  themes: NAVI_THEMES,
  initThemes,
  applyTheme,
  loadSavedTheme,
  setLightMode,
  loadSavedLightMode,
  toggleLightMode,
  updateLightModeButton
};