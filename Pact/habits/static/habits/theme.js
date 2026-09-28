(function () {
  var STORAGE_KEY = "pact-theme";
  var root = document.documentElement;

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* ignore quota / private mode */
    }
  }

  function updateThemeButton() {
    var button = document.getElementById("theme-toggle");
    if (!button) return;
    var dark = currentTheme() === "dark";
    var icon = button.querySelector("i");
    if (icon) {
      icon.className = dark ? "bi bi-moon-fill" : "bi bi-sun-fill";
    }
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
    updateThemeButton();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    if (button) {
      updateThemeButton();
      button.addEventListener("click", toggleTheme);
    }
  });
})();
