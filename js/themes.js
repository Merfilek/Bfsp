const designMenuBtn = document.getElementById("designMenuBtn");
const designDropdown = document.getElementById("designDropdown");
const themeOptionButtons = document.querySelectorAll(".theme-option");

function refreshThemeMenuState() {
  themeOptionButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === currentPresentationTheme);
  });
}

function setPresentationTheme(theme) {
  currentPresentationTheme = theme;
  refreshThemeMenuState();
  renderSlideCanvas();
  scheduleSave();
}

designMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!designDropdown.classList.contains("open")) refreshThemeMenuState();
  designDropdown.classList.toggle("open");
});

themeOptionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setPresentationTheme(btn.dataset.theme);
    designDropdown.classList.remove("open");
  });
});
