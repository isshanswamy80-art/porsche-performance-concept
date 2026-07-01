const root = document.documentElement;
const body = document.body;
const header = document.querySelector("[data-header]");
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let scrollFrame = 0;
let lastScrollY = window.scrollY;
let loadingFinished = false;
let configImageTimer = 0;

// Loading and page transition lifecycle.
const finishLoading = () => {
  if (loadingFinished) return;
  loadingFinished = true;
  root.classList.add("is-loaded");

  window.setTimeout(() => {
    root.classList.remove("is-loading", "is-loaded");
  }, prefersReducedMotion.matches ? 0 : 540);
};

window.requestAnimationFrame(() => {
  root.classList.add("page-ready");
});

window.addEventListener("load", finishLoading, { once: true });
window.setTimeout(finishLoading, 1800);

// Sticky navigation behavior.
const closeNav = () => {
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
  body.classList.remove("nav-open");
  header?.classList.remove("is-hidden");
};

const syncHeader = (currentY = window.scrollY) => {
  if (!header) return;

  const scrollingDown = currentY > lastScrollY + 8;
  const scrollingUp = currentY < lastScrollY - 6;

  header.classList.toggle("is-scrolled", currentY > 20);

  if (!body.classList.contains("nav-open")) {
    if (scrollingDown && currentY > 180) {
      header.classList.add("is-hidden");
    } else if (scrollingUp || currentY < 80) {
      header.classList.remove("is-hidden");
    }
  }
};

if (toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    const nextOpen = !isOpen;

    toggle.setAttribute("aria-expanded", String(nextOpen));
    toggle.setAttribute("aria-label", nextOpen ? "Close menu" : "Open menu");
    body.classList.toggle("nav-open", nextOpen);
    header?.classList.remove("is-hidden");
  });
}

document.addEventListener("click", (event) => {
  if (!body.classList.contains("nav-open") || !header) return;
  if (!header.contains(event.target)) closeNav();
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeNav);
});

// Optional hero video. Leave data-video-src empty to use the image fallback.
const heroVideo = document.querySelector("[data-hero-video]");

const initHeroVideo = () => {
  if (!heroVideo || prefersReducedMotion.matches) return;

  const videoSrc = heroVideo.dataset.videoSrc?.trim();
  if (!videoSrc && !heroVideo.querySelector("source")) return;

  if (videoSrc && !heroVideo.querySelector("source")) {
    const source = document.createElement("source");
    source.src = videoSrc;
    source.type = heroVideo.dataset.videoType || "video/mp4";
    heroVideo.append(source);
  }

  heroVideo.addEventListener(
    "canplay",
    async () => {
      heroVideo.classList.add("is-ready");
      try {
        await heroVideo.play();
      } catch {
        heroVideo.classList.remove("is-ready");
      }
    },
    { once: true },
  );

  heroVideo.load();
};

initHeroVideo();

// Smooth parallax for cinematic media only.
const parallaxItems = document.querySelectorAll(".hero-media, .hero-video, .page-hero > img");

const syncParallax = () => {
  if (prefersReducedMotion.matches || !parallaxItems.length) return;

  const viewportHeight = window.innerHeight || 1;

  parallaxItems.forEach((item) => {
    const frame = item.closest(".hero, .page-hero");
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.bottom < -120 || rect.top > viewportHeight + 120) return;

    const frameCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportHeight / 2;
    const progress = (viewportCenter - frameCenter) / (viewportHeight + rect.height);
    const distance = item.classList.contains("hero-media") || item.classList.contains("hero-video") ? 24 : 32;
    const y = `${(progress * distance).toFixed(2)}px`;

    item.style.setProperty("--parallax-y", y);
    item.style.setProperty("--hero-y", y);
  });
};

const syncScrollEffects = () => {
  const currentY = window.scrollY;
  syncHeader(currentY);
  syncParallax();
  lastScrollY = currentY;
  scrollFrame = 0;
};

const requestScrollEffects = () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(syncScrollEffects);
};

syncScrollEffects();
window.addEventListener("scroll", requestScrollEffects, { passive: true });
window.addEventListener("resize", requestScrollEffects, { passive: true });

// Cross-page fade for local navigation.
document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    let nextUrl;
    try {
      nextUrl = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) return;
    if (nextUrl.pathname === window.location.pathname && nextUrl.hash) return;

    closeNav();

    if (prefersReducedMotion.matches) return;

    event.preventDefault();
    root.classList.add("page-leaving");

    window.setTimeout(() => {
      window.location.href = nextUrl.href;
    }, 220);
  });
});

// Scroll-triggered reveals with section-level staggering.
if (revealItems.length && "IntersectionObserver" in window && !prefersReducedMotion.matches) {
  const revealGroups = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  revealItems.forEach((item) => {
    const group = item.closest("section, footer") || body;
    const index = revealGroups.get(group) || 0;
    revealGroups.set(group, index + 1);
    item.style.setProperty("--reveal-delay", `${Math.min(index * 70, 260)}ms`);
    observer.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Animated numbers for performance/stat blocks.
const countItems = document.querySelectorAll("[data-count]");

const animateCount = (item) => {
  if (item.dataset.counted === "true") return;
  item.dataset.counted = "true";

  const target = Number.parseFloat(item.dataset.count);
  if (!Number.isFinite(target) || prefersReducedMotion.matches) return;

  const sourceText = item.textContent.trim();
  const suffix = sourceText.replace(/^[\d.]+/, "");
  const precision = String(item.dataset.count).includes(".") ? 1 : 0;
  const duration = 1150;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    item.textContent = `${value.toFixed(precision)}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      item.textContent = `${target.toFixed(precision)}${suffix}`;
    }
  };

  window.requestAnimationFrame(tick);
};

if (countItems.length && "IntersectionObserver" in window) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.55 },
  );

  countItems.forEach((item) => countObserver.observe(item));
} else {
  countItems.forEach(animateCount);
}

// Gallery filtering and lightbox.
const filterButtons = document.querySelectorAll(".filter-button[data-filter]");
const galleryItems = document.querySelectorAll("[data-gallery] .gallery-item[data-category]");

if (filterButtons.length && galleryItems.length) {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      filterButtons.forEach((control) => {
        const isActive = control === button;
        control.classList.toggle("is-active", isActive);
        control.setAttribute("aria-pressed", String(isActive));
      });

      galleryItems.forEach((item) => {
        const shouldHide = filter !== "all" && item.dataset.category !== filter;
        item.classList.toggle("is-filtered", shouldHide);
      });
    });
  });

  filterButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
  });
}

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxClose = document.querySelector(".lightbox-close");
let lastLightboxTrigger = null;

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.setAttribute("hidden", "");
  lightbox.setAttribute("aria-hidden", "true");
  body.classList.remove("lightbox-open");

  if (lastLightboxTrigger) {
    lastLightboxTrigger.focus({ preventScroll: true });
    lastLightboxTrigger = null;
  }
};

if (lightbox && lightboxImage && lightboxCaption) {
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");

  document.querySelectorAll(".lightbox-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const image = trigger.querySelector("img");
      const caption = trigger.closest(".gallery-item")?.querySelector("figcaption");
      if (!image) return;

      lastLightboxTrigger = trigger;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt;
      lightboxCaption.textContent = caption ? caption.textContent : image.alt;
      lightbox.removeAttribute("hidden");
      lightbox.setAttribute("aria-hidden", "false");
      body.classList.add("lightbox-open");

      if (lightboxClose) lightboxClose.focus({ preventScroll: true });
    });
  });

  lightboxClose?.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

// Configurator state and preview transitions.
const configurator = document.querySelector("[data-configurator]");
const configImage = document.querySelector("[data-config-image]");
const configWash = document.querySelector("[data-config-wash]");
const configModel = document.querySelector("[data-config-model]");
const configPrice = document.querySelector("[data-config-price]");
const configReadout = document.querySelector("[data-config-readout]");

const checkedValue = (name) => configurator?.querySelector(`input[name="${name}"]:checked`);

const updateConfigurator = () => {
  if (!configurator) return;

  const model = checkedValue("model");
  const color = checkedValue("color");
  const wheels = checkedValue("wheels");
  const interior = checkedValue("interior");
  const pack = checkedValue("package");

  if (model) {
    if (configModel) configModel.textContent = model.value;
    if (configPrice) configPrice.textContent = model.dataset.price || "";

    if (configImage && model.dataset.image && configImage.getAttribute("src") !== model.dataset.image) {
      window.clearTimeout(configImageTimer);
      configImage.style.opacity = "0.3";
      configImageTimer = window.setTimeout(() => {
        configImage.src = model.dataset.image;
        configImage.alt = `${model.value} configured preview`;
        configImage.style.opacity = "1";
      }, 140);
    }
  }

  if (configWash && color?.dataset.color) {
    configWash.style.background = color.dataset.color;
  }

  if (configReadout && model && color && wheels && interior && pack) {
    configReadout.textContent = `${model.value} / ${color.value} / ${wheels.value} / ${interior.value} / ${pack.value}`;
  }
};

if (configurator) {
  configurator.addEventListener("change", updateConfigurator);
  updateConfigurator();
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (lightbox && !lightbox.hasAttribute("hidden")) {
    closeLightbox();
    return;
  }

  closeNav();
});
