// ═══════════════════════════════════════════════════════════════════
// τ (tau) – one full turn in radians
// ═══════════════════════════════════════════════════════════════════
const TAU = 6.283185307179586;

// ═══════════════════════════════════════════════════════════════════
// Detect reduced-motion preference and mobile
// ═══════════════════════════════════════════════════════════════════
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const isMobile = window.innerWidth < 700;

// ═══════════════════════════════════════════════════════════════════
// STARFIELD – performance-aware
// ═══════════════════════════════════════════════════════════════════
(() => {
  const c = document.getElementById("starfield");
  const ctx = c.getContext("2d");
  let w,
    h,
    stars = [];
  let t = 0;

  function getStarCount() {
    return window.innerWidth < 700 ? 120 : 220;
  }

  function resize() {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
  }

  function init() {
    resize();
    stars = Array.from({ length: getStarCount() }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.15,
      speed: Math.random() * 0.15 + 0.02,
      phase: Math.random() * TAU,
    }));
  }

  function renderFrame() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const flicker = prefersReducedMotion
        ? 0.7
        : 0.5 + 0.5 * Math.sin(t * s.speed * 20 + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fillStyle = `rgba(212,175,90,${s.a * flicker})`;
      ctx.fill();
    }
  }

  function draw() {
    t += 0.005;
    renderFrame();
    requestAnimationFrame(draw);
  }

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      init();
      renderFrame();
    }, 150);
  });

  init();
  if (!prefersReducedMotion) draw();
  else renderFrame();
})();

// ═══════════════════════════════════════════════════════════════════
// NAV SCROLL
// ═══════════════════════════════════════════════════════════════════
const nav = document.getElementById("mainNav");
let lastScrollY = 0;
let ticking = false;

window.addEventListener(
  "scroll",
  () => {
    lastScrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle("scrolled", lastScrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true },
);

// Active nav link
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setActiveNavLink(activeLink) {
  navLinks.forEach((link) => {
    const isActive = link === activeLink;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const link = document.querySelector(
          `.nav-links a[href="#${entry.target.id}"]`,
        );
        if (link) setActiveNavLink(link);
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" },
);

navSections.forEach((section) => observer.observe(section));

// ═══════════════════════════════════════════════════════════════════
// REVEAL ON SCROLL
// ═══════════════════════════════════════════════════════════════════
const reveals = document.querySelectorAll(".reveal");
if (prefersReducedMotion) {
  reveals.forEach((r) => r.classList.add("visible"));
} else {
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  reveals.forEach((r) => revealObs.observe(r));
}

// ═══════════════════════════════════════════════════════════════════
// TABS – accessible roles and keyboard support
// ═══════════════════════════════════════════════════════════════════
document.querySelectorAll(".tabs").forEach((tabsRoot) => {
  const buttons = Array.from(tabsRoot.querySelectorAll(".tab-btn"));
  const panels = Array.from(tabsRoot.querySelectorAll(".tab-content"));

  function activateTab(targetButton, moveFocus = false) {
    buttons.forEach((button) => {
      const isActive = button === targetButton;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    panels.forEach((panel) => {
      const isActive = panel.id === "tab-" + targetButton.dataset.tab;
      panel.classList.toggle("active", isActive);
      if (isActive) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    if (moveFocus) targetButton.focus();
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button));

    button.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
      if (event.key === "ArrowLeft")
        nextIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = buttons.length - 1;

      if (nextIndex !== null) {
        event.preventDefault();
        activateTab(buttons[nextIndex], true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CURVATURE VISUALIZATION – enhanced with redshift color mapping
// ═══════════════════════════════════════════════════════════════════
(() => {
  const canvas = document.getElementById("curvatureCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const massSlider = document.getElementById("massSlider");
  const gridSlider = document.getElementById("gridSlider");
  const massVal = document.getElementById("massValue");
  const gridVal = document.getElementById("gridValue");

  let animTime = 0;

  function draw() {
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Subtle background
    const bgGrad = ctx.createRadialGradient(
      W / 2,
      H / 2,
      0,
      W / 2,
      H / 2,
      W * 0.6,
    );
    bgGrad.addColorStop(0, "#0b0c10");
    bgGrad.addColorStop(1, "#090a0d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const mass = +massSlider.value;
    const gridN = +gridSlider.value;
    massVal.textContent = mass;
    gridVal.textContent = gridN;

    const cxC = W / 2,
      cyC = H / 2;
    const strength = mass * 40;
    const steps = gridN * 3;

    const minRadius = 8 + mass * 0.2;

    function warp(x, y) {
      const dx = x - cxC,
        dy = y - cyC;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) return { x: cxC, y: cyC, dist: 0 };

      const pull = strength / (dist + 12);
      const falloff = Math.exp((-dist * dist) / (300 * 300));

      let displacement = pull * falloff;
      const maxDisplacement = Math.max(0, dist - minRadius);
      displacement = Math.min(displacement, maxDisplacement);

      const nx = dx / dist;
      const ny = dy / dist;
      return {
        x: x - nx * displacement,
        y: y - ny * displacement,
        dist: dist,
      };
    }

    ctx.lineWidth = 1.0;

    // Helper to pick color from gold to red based on depth towards gravitational center
    function getStrokeStyle(distToCenter, opacity) {
      // Shorter distance -> deeper well -> more red
      const redRatio = Math.max(
        0.0,
        Math.min(1.0, 1.0 - distToCenter / (strength * 0.8 + 40)),
      );
      const hue = 43 - redRatio * 43; // 43 is gold/yellow, 0 is red
      return `hsla(${hue}, 60%, 55%, ${opacity})`;
    }

    // Warped grid lines
    for (let i = 0; i <= gridN; i++) {
      drawWarpedLine(true, i, gridN, steps, W, H);
    }
    const vLines = gridN * 2;
    for (let j = 0; j <= vLines; j++) {
      drawWarpedLine(false, j, vLines, steps, W, H);
    }

    function drawWarpedLine(isHorizontal, index, maxLines, segments, W, H) {
      ctx.beginPath();
      let started = false;
      let avgDist = 0;

      for (let k = 0; k <= segments; k++) {
        const rawX = isHorizontal ? (k / segments) * W : (index / maxLines) * W;
        const rawY = isHorizontal ? (index / maxLines) * H : (k / segments) * H;

        const wp = warp(rawX, rawY);
        if (k === Math.floor(segments / 2)) avgDist = wp.dist;

        if (!started) {
          ctx.moveTo(wp.x, wp.y);
          started = true;
        } else {
          ctx.lineTo(wp.x, wp.y);
        }
      }

      const mid = isHorizontal
        ? Math.abs((index / maxLines) * H - cyC)
        : Math.abs((index / maxLines) * W - cxC);
      const alpha =
        0.15 + 0.22 * Math.max(0, 1 - mid / (isHorizontal ? 200 : 300));

      ctx.strokeStyle = getStrokeStyle(avgDist, alpha);
      ctx.stroke();
    }

    // Central mass glowing indicator
    const glowR = 5 + mass * 0.25;
    const grad = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, glowR * 5);
    grad.addColorStop(0, "rgba(208,96,96,0.6)"); // Redshift interior
    grad.addColorStop(0.3, "rgba(212,175,90,0.2)");
    grad.addColorStop(1, "rgba(212,175,90,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cxC, cyC, glowR * 5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = mass > 10 ? "#d06060" : "#d4af5a";
    ctx.beginPath();
    ctx.arc(cxC, cyC, glowR, 0, TAU);
    ctx.fill();

    // Tiny pulse
    animTime += 0.02;
    if (!prefersReducedMotion) requestAnimationFrame(draw);
  }

  massSlider.addEventListener("input", () => {
    massVal.textContent = massSlider.value;
  });
  gridSlider.addEventListener("input", () => {
    gridVal.textContent = gridSlider.value;
  });

  if (!prefersReducedMotion) requestAnimationFrame(draw);
  else {
    massSlider.addEventListener("change", draw);
    gridSlider.addEventListener("change", draw);
    draw();
  }
})();

// ═══════════════════════════════════════════════════════════════════
// NEW: GRAVITATIONAL WAVE (+) POLARIZATION SIMULATOR
// ═══════════════════════════════════════════════════════════════════
(() => {
  const canvas = document.getElementById("gwCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const ampSlider = document.getElementById("gwAmpSlider");
  const freqSlider = document.getElementById("gwFreqSlider");
  const ampVal = document.getElementById("gwAmpValue");
  const freqVal = document.getElementById("gwFreqValue");

  let t = 0;
  const PARTICLE_COUNT = 32;
  const thetas = Array.from(
    { length: PARTICLE_COUNT },
    (_, i) => TAU * (i / PARTICLE_COUNT),
  );

  function drawGW() {
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Deep background
    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, W, H);

    const amp = +ampSlider.value;
    const freq = +freqSlider.value;
    ampVal.textContent = amp;
    freqVal.textContent = freq;

    const cx = W / 2,
      cy = H / 2;
    const r = 90; // Base radius

    // Calculate dimensional wave strain h(t)
    // h+ polarization causes stretching in x and squeezing in y, then vice-versa
    const strain = (amp / 100) * 0.45 * Math.sin(t * (freq * 0.0015));

    // Connect particles softly to visualize the deformation easily
    ctx.beginPath();
    for (let i = 0; i < thetas.length; i++) {
      const hx = 1 + strain;
      const hy = 1 - strain;
      const px = cx + r * Math.cos(thetas[i]) * hx;
      const py = cy + r * Math.sin(thetas[i]) * hy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(109, 156, 212, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw the free-floating test masses
    for (let theta of thetas) {
      const hx = 1 + strain;
      const hy = 1 - strain;
      const px = cx + r * Math.cos(theta) * hx;
      const py = cy + r * Math.sin(theta) * hy;

      // Highlight a few markers (top/bottom, left/right) for tracking clarity
      const isAxis =
        theta % (TAU / 4) < 0.01 || Math.abs(theta - TAU / 4) < 0.01;

      ctx.beginPath();
      ctx.arc(px, py, isAxis ? 4.5 : 3.5, 0, TAU);
      ctx.fillStyle = isAxis ? "#d06060" : "#d4af5a";
      ctx.fill();
    }

    t++;
    if (!prefersReducedMotion) requestAnimationFrame(drawGW);
  }

  ampSlider.addEventListener("input", () => {
    ampVal.textContent = ampSlider.value;
    if (prefersReducedMotion) drawGW();
  });
  freqSlider.addEventListener("input", () => {
    freqVal.textContent = freqSlider.value;
    if (prefersReducedMotion) drawGW();
  });

  if (!prefersReducedMotion) requestAnimationFrame(drawGW);
  else drawGW();
})();

// ═══════════════════════════════════════════════════════════════════
// GEODESIC ORBIT SIMULATION – enriched visualization
// ═══════════════════════════════════════════════════════════════════
(() => {
  const canvas = document.getElementById("orbitCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const cx = W / 2,
    cy = H / 2;
  const slider = document.getElementById("bhMassSlider");
  const valSpan = document.getElementById("bhMassValue");

  function getRS(mass) {
    return mass * 0.4 + 5;
  }

  function fillBackground(alpha = 1) {
    ctx.fillStyle = `rgba(11, 12, 16, ${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBlackHoleBase(rs) {
    const diskOuter = rs * 3;
    const diskGrad = ctx.createRadialGradient(
      cx,
      cy,
      rs * 1.2,
      cx,
      cy,
      diskOuter,
    );
    diskGrad.addColorStop(0, "rgba(212,175,90,0.05)");
    diskGrad.addColorStop(0.6, "rgba(180,130,60,0.02)");
    diskGrad.addColorStop(1, "rgba(180,130,60,0)");
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, diskOuter, 0, TAU);
    ctx.fill();

    // Event horizon
    ctx.beginPath();
    ctx.arc(cx, cy, rs, 0, TAU);
    ctx.fillStyle = "#050608";
    ctx.fill();

    // Glow
    const hGrad = ctx.createRadialGradient(cx, cy, rs * 0.7, cx, cy, rs + 15);
    hGrad.addColorStop(0, "rgba(212,175,90,0)");
    hGrad.addColorStop(0.6, "rgba(212,175,90,0.35)");
    hGrad.addColorStop(0.85, "rgba(212,175,90,0.1)");
    hGrad.addColorStop(1, "rgba(212,175,90,0)");
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rs + 15, 0, TAU);
    ctx.fill();

    // Photon sphere
    const photonR = rs * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, photonR, 0, TAU);
    ctx.strokeStyle = "rgba(212,175,90,0.1)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 5]);
    ctx.stroke();

    const iscoR = rs * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, iscoR, 0, TAU);
    ctx.strokeStyle = "rgba(109,156,212,0.08)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawOrbitLabels(rs, GM, note = "") {
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = "rgba(212,175,90,0.4)";
    ctx.textAlign = "left";
    ctx.fillText(
      "r\u209B = " + rs.toFixed(1) + "  GM = " + GM.toFixed(0),
      10,
      18,
    );

    if (note) {
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = "rgba(212,175,90,0.45)";
      ctx.textAlign = "center";
      ctx.fillText(note, W / 2, H - 16);
    }
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      const mass = +slider.value;
      const rs = getRS(mass);
      const GM = mass * 15;

      const minR = rs * 3 + 20;
      const maxR = rs * 3 + 100;
      const r = minR + Math.random() * (maxR - minR);
      const angle = Math.random() * TAU;

      this.x = cx + Math.cos(angle) * r;
      this.y = cy + Math.sin(angle) * r;

      const vCirc = Math.sqrt(GM / r);
      const speedFactor = 0.6 + Math.random() * 0.6;
      const speed = vCirc * speedFactor;

      const dir = Math.random() > 0.25 ? 1 : -1;
      const tangent = angle + (TAU / 4) * dir;
      const radialKick = (Math.random() - 0.5) * vCirc * 0.15;

      this.vx = Math.cos(tangent) * speed + Math.cos(angle) * radialKick;
      this.vy = Math.sin(tangent) * speed + Math.sin(angle) * radialKick;

      this.trail = [];
      this.maxTrail = 140;
      this.age = 0;
      this.maxAge = 1000 + Math.random() * 800;
    }
  }

  const PARTICLE_COUNT = isMobile ? 12 : 20;
  const particles = Array.from(
    { length: PARTICLE_COUNT },
    () => new Particle(),
  );

  function step(p, GM, rs, dt) {
    const dx = cx - p.x;
    const dy = cy - p.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    if (dist < 0.5) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const aGrav = GM / distSq;
    const grCorrection = 1 + (3 * (rs * rs)) / distSq;

    const ax = nx * aGrav * grCorrection;
    const ay = ny * aGrav * grCorrection;

    p.vx += ax * dt;
    p.vy += ay * dt;

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const maxSpeed = 16;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      p.vx *= scale;
      p.vy *= scale;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  function drawStaticScene() {
    const mass = +slider.value;
    valSpan.textContent = mass;
    const GM = mass * 15;
    const rs = getRS(mass);

    fillBackground(1);
    drawBlackHoleBase(rs);
    drawOrbitLabels(rs, GM, "Motion reduced by system preference");
  }

  function resetParticles() {
    fillBackground(1);
    particles.forEach((p) => p.reset());
  }

  slider.addEventListener("input", () => {
    valSpan.textContent = slider.value;
    if (prefersReducedMotion) drawStaticScene();
    else resetParticles();
  });

  function render() {
    const mass = +slider.value;
    valSpan.textContent = mass;
    const GM = mass * 15;
    const rs = getRS(mass);

    fillBackground(0.12);
    drawBlackHoleBase(rs);

    for (const p of particles) {
      const subSteps = 5;
      const dt = 1 / subSteps;
      for (let s = 0; s < subSteps; s++) {
        step(p, GM, rs, dt);
      }

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.maxTrail) p.trail.shift();
      p.age++;

      // Shift color to intense red/purple the closer and faster it moves
      const dx = cx - p.x,
        dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const intensity = Math.max(0, Math.min(1, 1 - (dist - rs) / (rs * 3)));
      const hue = 40 - intensity * 40; // 40=yellow, 0=red
      const lit = 50 + intensity * 15;

      if (p.trail.length > 2) {
        for (let i = 2; i < p.trail.length; i++) {
          const progress = i / p.trail.length;
          const alpha = progress * progress * 0.75;
          const lw = 0.5 + progress * 2.5;

          ctx.beginPath();
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.strokeStyle = `hsla(${hue}, 80%, ${lit}%, ${alpha})`;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, TAU);
      ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
      ctx.fill();

      if (
        dist < rs + 1 ||
        p.x < -100 ||
        p.x > W + 100 ||
        p.y < -100 ||
        p.y > H + 100 ||
        p.age > p.maxAge
      ) {
        p.reset();
      }
    }

    drawOrbitLabels(rs, GM);
    requestAnimationFrame(render);
  }

  if (!prefersReducedMotion) {
    fillBackground(1);
    requestAnimationFrame(render);
  } else {
    drawStaticScene();
  }
})();
