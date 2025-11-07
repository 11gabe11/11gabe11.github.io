// scripts.js
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const portals = document.getElementById("portals");

  // Your game can call this function to reveal portals.
  window.unlockPortals = function () {
    portals.classList.remove("hidden");
    portals.setAttribute("aria-hidden", "false");
    console.log("✅ portals unlocked");
  };

  console.log("✅ scripts.js loaded. Use window.unlockPortals() from the game.");
});
