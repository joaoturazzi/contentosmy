// ─────────────────────────────────────────────────────
// WS4 — CINEMATIC MODULES LIBRARY
// Módulos prontos para injeção direta no HTML gerado.
// NÃO modificar estes módulos — são a source of truth.
// ─────────────────────────────────────────────────────

export const CinematicModules = {

  // ── MÓDULO 1: GRAIN OVERLAY ──────────────────────────
  grain: () => `
/* MÓDULO: Grain Overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}`,

  // ── MÓDULO 2: MESH GRADIENT ──────────────────────────
  mesh: (color1 = '#333333', color2 = '#666666') => ({
    css: `
/* MÓDULO: Mesh Gradient */
.mesh-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.mesh-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
}
.mesh-orb-1 {
  width: 700px; height: 700px;
  background: ${color1};
  left: -200px; top: -200px;
  opacity: 0.12;
  animation: orb-drift-1 14s ease-in-out infinite;
}
.mesh-orb-2 {
  width: 500px; height: 500px;
  background: ${color2};
  right: -100px; top: 50px;
  opacity: 0.10;
  animation: orb-drift-2 18s ease-in-out infinite;
}
.mesh-orb-3 {
  width: 400px; height: 400px;
  background: ${color1};
  right: 200px; bottom: -100px;
  opacity: 0.08;
  animation: orb-drift-3 22s ease-in-out infinite;
}
@keyframes orb-drift-1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(60px,40px) scale(1.05); }
  66% { transform: translate(-30px,80px) scale(0.95); }
}
@keyframes orb-drift-2 {
  0%,100% { transform: translate(0,0) scale(1); }
  40% { transform: translate(-80px,60px) scale(1.1); }
  70% { transform: translate(40px,-40px) scale(0.95); }
}
@keyframes orb-drift-3 {
  0%,100% { transform: translate(0,0); }
  50% { transform: translate(-60px,-80px) scale(1.08); }
}`,
    html: `
<!-- MÓDULO: Mesh Gradient -->
<div class="mesh-bg" aria-hidden="true">
  <div class="mesh-orb mesh-orb-1"></div>
  <div class="mesh-orb mesh-orb-2"></div>
  <div class="mesh-orb mesh-orb-3"></div>
</div>`
  }),

  // ── MÓDULO 3: FLOATING ISLAND NAV ────────────────────
  floatingNav: (brandName = 'Brand', accentColor = '#ffffff', links = []) => ({
    css: `
/* MÓDULO: Floating Island Nav */
.nav-wrap {
  position: fixed;
  top: 1.5rem; left: 0; right: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 0 1.25rem;
}
.nav-island {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
  background: rgba(13,13,13,0.85);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9999px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  max-width: 900px;
  width: 100%;
  transition: border-color 0.3s;
}
.nav-island:hover { border-color: rgba(255,255,255,0.16); }
.nav-logo {
  font-size: 15px; font-weight: 700;
  letter-spacing: -0.02em;
  color: white; text-decoration: none;
  flex-shrink: 0;
}
.nav-links {
  display: flex; align-items: center;
  gap: 0.25rem; list-style: none;
  margin: 0; padding: 0;
}
@media (max-width: 768px) { .nav-links { display: none; } }
.nav-links a {
  color: rgba(255,255,255,0.6);
  text-decoration: none; font-size: 14px; font-weight: 500;
  padding: 0.5rem 0.875rem; border-radius: 9999px;
  transition: color 0.2s, background 0.2s;
}
.nav-links a:hover { color: white; background: rgba(255,255,255,0.08); }
.nav-links a.active { color: white; }
.nav-cta {
  display: flex; align-items: center; gap: 0.5rem;
  background: ${accentColor};
  color: #0a0a0a; font-size: 14px; font-weight: 700;
  padding: 0.6rem 1.25rem; border-radius: 9999px;
  text-decoration: none; border: none; cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.nav-cta:hover { transform: scale(1.03); }
.nav-cta:active { transform: scale(0.97); }
.nav-cta-icon {
  width: 20px; height: 20px;
  background: rgba(0,0,0,0.14); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.nav-cta:hover .nav-cta-icon { transform: translate(1px,-1px) scale(1.1); }`,
    html: `
<!-- MÓDULO: Floating Island Nav -->
<header>
  <div class="nav-wrap">
    <nav class="nav-island" role="navigation">
      <a href="#" class="nav-logo">${brandName}</a>
      <ul class="nav-links">
        ${links.map(l => `<li><a href="#${l.id}" class="nav-link">${l.label}</a></li>`).join('\n        ')}
      </ul>
      <a href="#cta" class="nav-cta">
        Fale Conosco
        <span class="nav-cta-icon">↗</span>
      </a>
    </nav>
  </div>
</header>`
  }),

  // ── MÓDULO 4: SCROLL REVEAL ──────────────────────────
  scrollReveal: () => ({
    css: `
/* MÓDULO: Scroll Reveal */
[data-reveal] {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.9s cubic-bezier(0.16,1,0.3,1),
    transform 0.9s cubic-bezier(0.16,1,0.3,1);
  transition-delay: calc(var(--stagger, 0) * 120ms);
}
[data-reveal].visible {
  opacity: 1;
  transform: translateY(0);
}`,
    js: `
/* MÓDULO: Scroll Reveal */
(function() {
  var observer = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );
  document.querySelectorAll('[data-reveal]').forEach(function(el) { observer.observe(el); });
})();`
  }),

  // ── MÓDULO 5: DOUBLE BEZEL ───────────────────────────
  doubleBevel: (surfaceColor = 'rgba(255,255,255,0.04)') => `
/* MÓDULO: Double Bezel */
.bezel-outer {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: calc(1.75rem + 6px);
  padding: 6px;
}
.bezel-inner {
  background: ${surfaceColor};
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.75rem;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.08);
  padding: 2rem;
  overflow: hidden;
}`,

  // ── MÓDULO 6: BUTTON-IN-BUTTON ───────────────────────
  buttonInButton: (bgColor = '#ffffff', textColor = '#0a0a0a') => `
/* MÓDULO: Button-in-Button */
.btn-primary {
  display: inline-flex; align-items: center; gap: 0.625rem;
  background: ${bgColor}; color: ${textColor};
  font-size: 15px; font-weight: 700;
  padding: 0.8125rem 1.5rem; border-radius: 9999px;
  text-decoration: none; border: none; cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
}
.btn-primary:hover { transform: scale(1.03) translateY(-1px); }
.btn-primary:active { transform: scale(0.97); }
.btn-icon {
  width: 22px; height: 22px;
  background: rgba(0,0,0,0.14); border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.btn-primary:hover .btn-icon { transform: translate(2px,-2px) scale(1.1); }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  color: rgba(255,255,255,0.6); font-size: 15px; font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}
.btn-secondary:hover { color: white; }`,

  // ── MÓDULO 7: ACCORDION ──────────────────────────────
  accordion: () => ({
    css: `
/* MÓDULO: Accordion */
.accordion-item {
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.accordion-trigger {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 1.25rem 0;
  background: none; border: none; cursor: pointer;
  color: white; font-size: 1rem; font-weight: 600;
  text-align: left;
  transition: color 0.2s;
}
.accordion-trigger:hover { color: rgba(255,255,255,0.7); }
.accordion-icon {
  font-size: 1.25rem; font-weight: 300;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  flex-shrink: 0;
}
.accordion-item.open .accordion-icon { transform: rotate(45deg); }
.accordion-content {
  max-height: 0; overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1);
}
.accordion-body { padding: 0 0 1.25rem; color: rgba(255,255,255,0.6); line-height: 1.65; }`,
    js: `
/* MÓDULO: Accordion */
(function() {
  document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var item = trigger.closest('.accordion-item');
      var content = item.querySelector('.accordion-content');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item.open').forEach(function(o) {
        o.classList.remove('open');
        o.querySelector('.accordion-content').style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
})();`
  }),

  // ── MÓDULO 8: ACTIVE NAV NO SCROLL ──────────────────
  activeNav: () => `
/* MÓDULO: Active Nav on Scroll */
(function() {
  var sectionObserver = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
          var link = document.querySelector('.nav-link[href="#' + entry.target.id + '"]');
          if (link) link.classList.add('active');
        }
      });
    },
    { threshold: 0.4 }
  );
  document.querySelectorAll('section[id]').forEach(function(s) { sectionObserver.observe(s); });
})();`,

  // ── HELPER: montar o bloco <style> completo ──────────
  buildStyleBlock: (config) => {
    const { colors, accentColor, surfaceColor } = config;
    const c1 = colors?.primary || '#333333';
    const c2 = colors?.secondary || '#555555';
    const accent = accentColor || colors?.accent || '#ffffff';

    return [
      CinematicModules.grain(),
      CinematicModules.mesh(c1, c2).css,
      CinematicModules.floatingNav('', accent, []).css,
      CinematicModules.scrollReveal().css,
      CinematicModules.doubleBevel(surfaceColor),
      CinematicModules.buttonInButton(accent),
      CinematicModules.accordion().css,
    ].join('\n');
  },

  // ── HELPER: montar o bloco de scripts ────────────────
  buildScriptBlock: () => {
    return [
      CinematicModules.scrollReveal().js,
      CinematicModules.accordion().js,
      CinematicModules.activeNav(),
    ].join('\n');
  },

  // ── HELPER: serializar para injetar no prompt do LLM ──
  serializeForPrompt: (config) => {
    return `
MÓDULOS CINEMÁTICOS PRONTOS — USE EXATAMENTE COMO ESTÃO:

=== CSS DOS MÓDULOS (inserir dentro do <style>) ===
${CinematicModules.buildStyleBlock(config)}

=== MESH HTML (inserir logo após o <body>) ===
${CinematicModules.mesh(config.colors?.primary, config.colors?.secondary).html}

=== SCRIPTS (inserir antes do </body>) ===
<script>
${CinematicModules.buildScriptBlock()}
</script>
`;
  }
};

export default CinematicModules;
