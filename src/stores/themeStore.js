import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme') === 'dark');

  function toggleTheme() {
    isDark.value = !isDark.value;
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    updateHtmlTheme();
  }

  function setTheme(dark) {
    isDark.value = dark;
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    updateHtmlTheme();
  }

  function updateHtmlTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  }

  // Ensure correct theme on load
  updateHtmlTheme();

  return { isDark, toggleTheme, setTheme };
});
