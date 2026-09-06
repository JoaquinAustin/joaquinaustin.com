// If the browser restores this page from its back/forward cache
// (e.g. after the user hits Back), it can restore the exact DOM
// state from the moment they left — including the "page-leaving"
// class added just before navigating away, which fades the whole
// page to opacity: 0 and (via animation-fill-mode: both) keeps it
// there. Without this, a restored page could appear to "not load"
// at all: fully blank, even though the HTML/CSS are fine.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    document.body.classList.remove("page-leaving");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const prefersReducedMotion = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Earth theme: soft rain effect ----
  const rain = { active: false, timers: [], layer: null };

  function stopRain() {
    rain.active = false;
    rain.timers.forEach(clearTimeout);
    rain.timers = [];
    if (rain.layer) {
      rain.layer.remove();
      rain.layer = null;
    }
  }

  function startRain() {
    if (rain.active || prefersReducedMotion) return;
    rain.active = true;

    const layer = document.createElement("div");
    layer.className = "earth-rain-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    rain.layer = layer;

    const wrapEl = document.querySelector(".wrap");

    function spawnDrop() {
      if (!rain.active) return;

      const vh = window.innerHeight;
      const bounds = wrapEl ? wrapEl.getBoundingClientRect() : { left: 0, right: window.innerWidth };
      const x = bounds.left + Math.random() * (bounds.right - bounds.left);

      const targets = document.querySelectorAll(
        ".home-project-image, .falcon-ph, .falcon-impact-card"
      );
      let landY = vh + 20;
      let hitBox = false;
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 0 || r.top > vh) return;
        if (x >= r.left && x <= r.right && r.top < landY) {
          landY = r.top;
          hitBox = true;
        }
      });

      const startY = -20;
      const fallDistance = landY - startY;
      const duration = Math.max(0.6, fallDistance / 420);

      const drop = document.createElement("span");
      drop.className = "earth-raindrop";
      drop.style.left = x + "px";
      drop.style.top = startY + "px";
      drop.style.setProperty("--fall-distance", fallDistance + "px");
      drop.style.setProperty("--fall-duration", duration + "s");
      layer.appendChild(drop);

      drop.addEventListener("animationend", () => {
        drop.remove();
        if (hitBox) {
          const ripple = document.createElement("span");
          ripple.className = "earth-ripple";
          ripple.style.left = x + "px";
          ripple.style.top = landY + "px";
          layer.appendChild(ripple);
          ripple.addEventListener("animationend", () => ripple.remove());
        }
      });

      rain.timers.push(setTimeout(spawnDrop, 700 + Math.random() * 900));
    }

    rain.timers.push(setTimeout(spawnDrop, 3500));
  }

  // ---- Lightbox: click an image to view it larger ----
  const zoomables = document.querySelectorAll(".falcon-ph");
  if (zoomables.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "joa-lightbox";
    lightbox.innerHTML =
      '<button type="button" class="joa-lightbox-close" aria-label="Close">' +
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 4L14 14M14 4L4 14" stroke="black" stroke-width="1.5" stroke-linecap="round"/>' +
      "</svg></button>" +
      '<div class="joa-lightbox-content"></div>';
    document.body.appendChild(lightbox);

    const content = lightbox.querySelector(".joa-lightbox-content");
    const closeBtn = lightbox.querySelector(".joa-lightbox-close");

    const openLightbox = (sourceEl) => {
      content.innerHTML = "";
      const img = sourceEl.tagName === "IMG" ? sourceEl : sourceEl.querySelector("img");
      if (img && img.src) {
        const clone = document.createElement("img");
        clone.src = img.src;
        clone.alt = img.alt || "";
        content.appendChild(clone);
      }
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    zoomables.forEach((el) => {
      el.addEventListener("click", () => {
        const isDesktop = window.matchMedia("(min-width: 641px)").matches;
        if (isDesktop) openLightbox(el);
      });
    });
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  const themeButtons = document.querySelectorAll(".theme-switch button[data-theme]");
  if (themeButtons.length) {
    const body = document.body;

    const applyTheme = (theme) => {
      body.setAttribute("data-theme", theme);
      themeButtons.forEach((b) => {
        if (b.dataset.theme === theme) {
          b.setAttribute("aria-current", "true");
        } else {
          b.removeAttribute("aria-current");
        }
      });
      if (theme === "earth") {
        startRain();
      } else {
        stopRain();
      }
    };

    let saved = null;
    try {
      saved = localStorage.getItem("joa-theme");
    } catch (e) {
      /* localStorage unavailable (e.g. sandboxed preview) — ignore */
    }
    if (saved) {
      applyTheme(saved);
    }

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        applyTheme(theme);
        try {
          localStorage.setItem("joa-theme", theme);
        } catch (e) {
          /* ignore */
        }
      });
    });
  }

  // Soft fade-out before navigating to another page on this site,
  // pairs with the fade-in animation every page runs on load.
  // Skipped only when BOTH the current page and the link target are
  // Home or About — those two share the same layout, so the
  // browser's native cross-document view transition (which only
  // those two pages opt into, via the @view-transition style in
  // their <head>) gives a smooth crossfade with no reload flash.
  // Any navigation involving a project page always uses this manual
  // fade instead: the browser's default cross-fade overlaps the old
  // and new page at ~50% opacity each, which looks broken between
  // pages with very different layouts.
  const supportsCrossDocumentViewTransitions = "onpageswap" in window;

  function isHomeOrAbout(pathOrHref) {
    const clean = pathOrHref.split("/").pop().split("?")[0].split("#")[0].replace(/\.html$/, "");
    return clean === "" || clean === "index" || clean === "about";
  }

  const currentPageIsHomeOrAbout = isHomeOrAbout(window.location.pathname);

  document.addEventListener("click", (e) => {
    if (prefersReducedMotion) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      link.target === "_blank"
    ) {
      return;
    }
    if (
      supportsCrossDocumentViewTransitions &&
      currentPageIsHomeOrAbout &&
      isHomeOrAbout(href)
    ) {
      return;
    }
    e.preventDefault();
    document.body.classList.add("page-leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 160);
  });
});
