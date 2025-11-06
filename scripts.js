// scripts.js

// Wait until the HTML is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ scripts.js is connected and running.");

  // --- Smooth scroll for internal links ---
  const smoothLinks = document.querySelectorAll('a[href^="#"]');
  smoothLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();               // prevents instant jump
      const targetID = link.getAttribute("href");
      const targetSection = document.querySelector(targetID);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
});
