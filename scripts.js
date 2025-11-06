// scripts.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ scripts.js is connected and running.");

  // --- Smooth scroll for internal links ---
  const smoothLinks = document.querySelectorAll('a[href^="#"]');
  smoothLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetID = link.getAttribute("href");
      const targetSection = document.querySelector(targetID);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // --- Mobile menu toggle ---
  const toggleBtn = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");

  if (toggleBtn && nav) {
    toggleBtn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      // keep ARIA state accurate for accessibility
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
    });

    // Close menu after clicking a nav link (mobile)
    nav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        if (nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }
});
