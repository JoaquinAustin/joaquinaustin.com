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
        ".home-project-image, .project-ph, .project-ph-static, .project-impact-card"
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
  const zoomables = document.querySelectorAll(".project-ph");
  if (zoomables.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "joa-lightbox" + (document.querySelector(".page-project-v2") ? " joa-lightbox--v2" : "");
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

  // ---- v2 project pages: Full Case / Keep it short sidebar switch ----
  const v2SwitchEls = document.querySelectorAll(".project-v2-switch [data-mode]");
  if (v2SwitchEls.length) {
    // Sequential cross-fade: the outgoing content fades fully to
    // invisible and is pulled out of the flow (display:none) BEFORE
    // the incoming content appears and fades in. A simultaneous
    // cross-fade (both fading at once) looks broken here because
    // Full Case and Keep it short have different content and
    // heights — for a moment you'd see both the TOC and the short
    // summary, or both the lead paragraph and the "Overview"
    // heading, stacked on top of each other.
    const FADE_MS = 200;
    let timers = [];
    const clearV2Timers = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };

    const applyV2Mode = (isShort, animate) => {
      clearV2Timers();

      const toHide = document.querySelectorAll(isShort ? ".v2-full-only" : ".v2-short-only");
      const toShow = document.querySelectorAll(isShort ? ".v2-short-only" : ".v2-full-only");

      if (!animate || prefersReducedMotion) {
        toHide.forEach((node) => {
          node.style.display = "none";
          node.style.opacity = "";
        });
        toShow.forEach((node) => {
          node.style.display = "";
          node.style.opacity = "";
        });
        document.body.classList.toggle("mode-short", isShort);
        document.body.classList.toggle("gap-short", isShort);
        return;
      }

      // Step 1: fade out whatever's currently showing, in place.
      toHide.forEach((node) => {
        node.style.opacity = "0";
      });

      // Step 2: once it's fully invisible, drop it from the flow and
      // fade the new content in — never both visible at once.
      timers.push(window.setTimeout(() => {
        toHide.forEach((node) => {
          node.style.display = "none";
        });

        toShow.forEach((node) => {
          node.style.display = "";
          node.style.opacity = "0";
        });
        // Reflow so the browser commits display:'' + opacity:0 above
        // before we transition opacity back up — otherwise it can
        // skip straight to the end state with no visible fade-in.
        void document.body.offsetHeight;

        document.body.classList.toggle("mode-short", isShort);
        document.body.classList.toggle("gap-short", isShort);

        toShow.forEach((node) => {
          node.style.opacity = "";
        });
      }, FADE_MS));
    };

    // Set the initial hidden state immediately (no animation) so
    // there's no flash/gap before the user ever touches the switch.
    applyV2Mode(false, false);

    v2SwitchEls.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        v2SwitchEls.forEach((other) => {
          other.classList.remove("project-v2-switch-active");
          other.classList.add("project-v2-switch-inactive");
        });
        el.classList.remove("project-v2-switch-inactive");
        el.classList.add("project-v2-switch-active");
        applyV2Mode(el.dataset.mode === "short", true);
      });
    });
  }

  // ---- v2 project pages: TOC scroll-spy + smooth scroll ----
  const tocLinks = document.querySelectorAll(".project-v2-toc a[data-target]");
  if (tocLinks.length) {
    const sections = Array.from(tocLinks)
      .map((link) => document.getElementById(link.dataset.target))
      .filter(Boolean);

    const setCurrent = (id) => {
      tocLinks.forEach((link) => {
        link.classList.toggle("is-current", link.dataset.target === id);
      });
    };

    tocLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.target);
        if (target) {
          target.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
          });
        }
        setCurrent(link.dataset.target);
      });
    });

    if (sections.length && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length) {
            setCurrent(visible[0].target.id);
          }
        },
        { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
      );
      sections.forEach((section) => observer.observe(section));
      setCurrent(sections[0].id);

      // The observer's band sits near the top of the viewport, so a
      // short final section (e.g. "Conclusions", with just a
      // paragraph and not much page left below it) can scroll past
      // that band before the page hits its actual bottom — it's
      // never "current" even though it's the last thing on screen.
      // Force the last section once the page is scrolled all the
      // way down, overriding whatever the observer last set.
      const lastSectionId = sections[sections.length - 1].id;
      let bottomCheckTimer = null;
      window.addEventListener(
        "scroll",
        () => {
          window.clearTimeout(bottomCheckTimer);
          bottomCheckTimer = window.setTimeout(() => {
            const atBottom =
              window.innerHeight + window.scrollY >=
              document.documentElement.scrollHeight - 2;
            if (atBottom) {
              setCurrent(lastSectionId);
            }
          }, 50);
        },
        { passive: true }
      );
    }
  }

  // ---- Home mobile menu (hamburger toggle) ----
  const menuToggle = document.querySelector(".project-v2-menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.querySelectorAll(".project-v2-toc a, .project-v2-mobile-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- Home/project-list links to password-protected projects ----
  // Going straight to the project page only to have its own inline
  // script immediately bounce to project-password.html is a visible
  // double-hop (project page flashes in, unstyled, before redirecting).
  // Rewrite the href once, up front, so there's only ever one
  // navigation — and so the page's normal fade-out-on-click handling
  // (below) picks up the right destination without any special-casing.
  document.querySelectorAll(".home-v2-project-link").forEach((link) => {
    if (!link.querySelector(".lock-icon")) return;
    let alreadyUnlocked = false;
    try {
      alreadyUnlocked = sessionStorage.getItem("projectUnlocked") === "true";
    } catch (err) {
      /* sessionStorage unavailable — leave the href as-is; the
         project page's own inline script will handle it */
    }
    if (!alreadyUnlocked) {
      const dest = link.getAttribute("href");
      link.setAttribute("href", "project-password.html?next=" + encodeURIComponent(dest));
    }
  });

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
  // one of the "simple sidebar" pages (Home, About, the password
  // gate) — those share close-enough layouts that the browser's
  // native cross-document view transition (opted into via the
  // @view-transition style in each of their <head>s) gives a smooth
  // crossfade with no reload flash, instead of the plain fade below.
  // Any navigation involving a full project page always uses the
  // manual fade instead: the browser's default cross-fade overlaps
  // the old and new page at ~50% opacity each, which looks broken
  // between pages with very different layouts (sidebar TOC, images,
  // etc. appearing/disappearing mid-fade).
  const supportsCrossDocumentViewTransitions = "onpageswap" in window;

  function isSimpleSidebarPage(pathOrHref) {
    const clean = pathOrHref.split("/").pop().split("?")[0].split("#")[0].replace(/\.html$/, "");
    return clean === "" || clean === "index" || clean === "about" || clean === "project-password";
  }

  const currentPageIsSimpleSidebar = isSimpleSidebarPage(window.location.pathname);

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
      currentPageIsSimpleSidebar &&
      isSimpleSidebarPage(href)
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
