// ─────────────────────────────────────────────────────
// WS4 — PIPELINE DE 4 CHAMADAS
// AUDIT → PLAN → BUILD (shell+sections) → FIX
// Architecture: CODE builds shell, MODEL generates only section content
// ─────────────────────────────────────────────────────

import { loadSkills, buildAuditSystemPrompt, buildPlanSystemPrompt, buildBuildSystemPrompt, buildFixSystemPrompt } from './skills-loader.js';
import { CinematicModules } from './cinematic-modules.js';

const MODELS = {
  audit: 'google/gemini-2.0-flash-001',
  plan:  'google/gemini-2.0-flash-001',
  build: 'google/gemini-2.0-flash-001',
  fix:   'google/gemini-2.0-flash-001',
};

const TIMEOUTS = { audit: 30000, plan: 45000, build: 120000, fix: 90000 };

async function callOR(key, model, systemPrompt, userPrompt, maxTokens, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://contentos.app', 'X-Title': 'WS4 Pipeline' },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.25, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
      signal: ctrl.signal,
    });
    const d = await r.json();
    if (!r.ok || d.error) {
      const code = d.error?.code || r.status;
      if (code === 401 || code === '401') throw new Error('API key invalida');
      if (code === 402 || code === '402') throw new Error('Creditos insuficientes');
      if (code === 429) throw new Error('Rate limit — aguarde 30s');
      throw new Error('OpenRouter: ' + (typeof d.error === 'string' ? d.error : d.error?.message || JSON.stringify(d.error)));
    }
    return d.choices?.[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout ${timeoutMs / 1000}s`);
    throw e;
  } finally { clearTimeout(timer); }
}

function safeJSON(raw) {
  if (!raw) throw new Error('Resposta vazia');
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(raw.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim()); } catch {}
  try { const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if (m) return JSON.parse(m[0]); } catch {}
  try {
    let p = raw.replace(/^```(?:json)?\n?/gm, '').trim().replace(/,\s*$/, '');
    let o = (p.match(/[\{\[]/g) || []).length, c = (p.match(/[\}\]]/g) || []).length;
    while (c < o) { p += p.lastIndexOf('[') > p.lastIndexOf('{') ? ']' : '}'; c++; }
    return JSON.parse(p);
  } catch {}
  throw new Error('JSON invalido: ' + raw.slice(0, 400));
}

// ════════════════════════════════════════════════════════
// CHAMADA 1 — AUDIT (unchanged)
// ════════════════════════════════════════════════════════
export async function runAudit(scraped, key, onProgress) {
  onProgress?.('Auditando site com redesign-skill...');
  const skills = await loadSkills();
  const raw = await callOR(key, MODELS.audit, buildAuditSystemPrompt(skills),
    `Analise este site:\nURL: ${scraped.metadata.url}\nTitulo: ${scraped.metadata.title}\nH1s: ${scraped.headings.h1.join(' | ')}\nH2s: ${scraped.headings.h2.slice(0, 6).join(' | ')}\nCores: ${scraped.colors.join(', ') || 'nenhuma'}\nFonts: ${scraped.fonts?.join(', ') || 'nenhuma'}\nLogo: ${scraped.logoUrl || 'nao encontrada'}\n\n${scraped.markdown.slice(0, 5000)}\n\nRetorne JSON com problemas.`,
    1200, TIMEOUTS.audit);
  const audit = safeJSON(raw);
  if (!audit.problems) audit.problems = [];
  if (!audit.vibe_recommended) audit.vibe_recommended = 'ethereal_glass';
  onProgress?.(`Audit: ${audit.problems.length} problemas`);
  return audit;
}

// ════════════════════════════════════════════════════════
// CHAMADA 2 — PLAN (unchanged)
// ════════════════════════════════════════════════════════
export async function runPlan(scraped, blueprint, audit, vibe, key, onProgress) {
  onProgress?.('Planejando secoes...');
  const skills = await loadSkills();
  const critical = (audit.problems || []).filter(p => p.severity === 'critical' || p.severity === 'major').map(p => `- ${p.found} → ${p.fix}`).join('\n');
  const feats = blueprint.copy?.sections?.find(s => s.id === 'features')?.items || [];
  const about = blueprint.copy?.sections?.find(s => s.id === 'about') || {};
  const contact = blueprint.copy?.sections?.find(s => s.id === 'contact') || {};
  const raw = await callOR(key, MODELS.plan, buildPlanSystemPrompt(skills),
    `Plano de secoes:\n\nEMPRESA: ${blueprint.business.name} (${blueprint.business.sector})\nProduto: ${blueprint.business.main_product}\nHeadline: "${blueprint.copy.hero_headline}"\nSub: "${blueprint.copy.hero_sub}"\nCTA: "${blueprint.copy.hero_cta}"\nFeatures: ${feats.map(f => f.title).join(', ')}\nSobre: ${about.content || ''}\nContato: ${contact.phone || ''} ${contact.email || ''}\nCores: ${blueprint.brand.colors.primary} / ${blueprint.brand.colors.accent}\nFont: ${blueprint.brand.typography.display}\nVIBE: ${vibe}\nImagens: ${scraped.images?.slice(0, 4).join(', ') || 'nenhuma'}\n\nProblemas:\n${critical || 'nenhum critico'}\n\nPlanejar 8 secoes: hero, stats, features(bento), about, setor-especifica, social_proof, cta, footer.\nRetorne JSON.`,
    2000, TIMEOUTS.plan);
  const plan = safeJSON(raw);
  if (!plan.sections || plan.sections.length < 3) throw new Error('Plano invalido');
  onProgress?.(`Plano: ${plan.sections.length} secoes`);
  return plan;
}

// ════════════════════════════════════════════════════════
// SHELL BUILDER — code builds the entire HTML wrapper
// ════════════════════════════════════════════════════════
function buildHTMLShell(blueprint, plan, scraped, vibe) {
  const colors = blueprint.brand.colors;
  const font = blueprint.brand.typography.display || 'Cabinet Grotesk';
  const modules = CinematicModules;

  const vibeVars = {
    ethereal_glass: { '--bg':'#050505','--surface':'#0d0d0d','--surface2':'#111111','--text':'#FFFFFF','--text-60':'rgba(255,255,255,0.6)','--text-40':'rgba(255,255,255,0.4)','--text-20':'rgba(255,255,255,0.2)','--border':'rgba(255,255,255,0.08)','--border-h':'rgba(255,255,255,0.16)','--card-bg':'rgba(255,255,255,0.04)','--card-border':'rgba(255,255,255,0.08)' },
    editorial_luxury: { '--bg':'#FDFBF7','--surface':'#F4F1EB','--surface2':'#EDE9E0','--text':'#111111','--text-60':'rgba(17,17,17,0.6)','--text-40':'rgba(17,17,17,0.4)','--text-20':'rgba(17,17,17,0.2)','--border':'rgba(0,0,0,0.08)','--border-h':'rgba(0,0,0,0.16)','--card-bg':'#FFFFFF','--card-border':'rgba(0,0,0,0.06)' },
    soft_structuralism: { '--bg':'#F9FAFB','--surface':'#FFFFFF','--surface2':'#F3F4F6','--text':'#18181B','--text-60':'rgba(24,24,27,0.6)','--text-40':'rgba(24,24,27,0.4)','--text-20':'rgba(24,24,27,0.2)','--border':'rgba(226,232,240,0.7)','--border-h':'rgba(226,232,240,1)','--card-bg':'#FFFFFF','--card-border':'rgba(226,232,240,0.8)' },
    minimalist: { '--bg':'#F7F6F3','--surface':'#FFFFFF','--surface2':'#F0EFEB','--text':'#111111','--text-60':'#787774','--text-40':'#AEADA9','--text-20':'#D3D1CE','--border':'#EAEAEA','--border-h':'#D4D4D0','--card-bg':'#FFFFFF','--card-border':'#EAEAEA' },
    brutalist: { '--bg':'#F4F4F0','--surface':'#EAEAE6','--surface2':'#E0E0DB','--text':'#050505','--text-60':'rgba(5,5,5,0.6)','--text-40':'rgba(5,5,5,0.4)','--text-20':'rgba(5,5,5,0.2)','--border':'#050505','--border-h':'#050505','--card-bg':'#EAEAE6','--card-border':'#050505' },
  };
  const vars = vibeVars[vibe] || vibeVars.ethereal_glass;
  const cssVarsStr = [...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`), `  --primary: ${colors.primary};`, `  --secondary: ${colors.secondary};`, `  --accent: ${colors.accent};`, `  --font-display: '${font}', 'Cabinet Grotesk', sans-serif;`, `  --font-body: 'Outfit', sans-serif;`, `  --font-mono: 'JetBrains Mono', monospace;`, `  --radius-card: 1.75rem;`, `  --radius-pill: 9999px;`, `  --ease: cubic-bezier(0.16,1,0.3,1);`, `  --ease-spring: cubic-bezier(0.34,1.56,0.64,1);`].join('\n');

  const fontSlug = font.replace(/ /g, '+');
  const googleFonts = `https://fonts.googleapis.com/css2?family=${fontSlug}:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`;

  const meshData = modules.mesh(colors.primary, colors.secondary);
  const navLinks = (plan.sections || []).filter(s => !['hero', 'footer'].includes(s.id)).slice(0, 5).map(s => ({ id: s.id, label: s.name || s.id }));
  const logoHTML = blueprint.brand.logo_url && blueprint.brand.logo_url !== 'null'
    ? `<img src="${blueprint.brand.logo_url}" alt="${blueprint.business.name}" style="max-height:28px;width:auto;">`
    : `<span style="font-family:var(--font-display);font-weight:800;font-size:15px;letter-spacing:-0.03em;color:var(--text)">${blueprint.business.name}</span>`;
  const navData = modules.floatingNav(blueprint.business.name, colors.accent, navLinks);

  const moduleCSS = [modules.grain(), meshData.css, modules.scrollReveal().css, modules.doubleBevel(), modules.buttonInButton(colors.accent, vibe === 'ethereal_glass' ? '#0a0a0a' : '#ffffff'), navData.css, modules.accordion().css].join('\n');
  const moduleScripts = [modules.scrollReveal().js, modules.accordion().js, modules.activeNav()].join('\n');

  const navHTML = `<header><div class="nav-wrap"><nav class="nav-island" role="navigation"><a href="#hero" class="nav-logo" aria-label="${blueprint.business.name}">${logoHTML}</a><ul class="nav-links" role="list">${navLinks.map(l => `<li><a href="#${l.id}" class="nav-link">${l.label}</a></li>`).join('')}</ul><a href="#cta" class="nav-cta">${blueprint.copy.hero_cta || 'Fale Conosco'}<span class="nav-cta-icon" aria-hidden="true">↗</span></a></nav></div></header>`;

  const realImages = (scraped.images || []).filter(i => i && i.startsWith('http') && !i.includes('favicon') && !i.includes('1x1')).slice(0, 6);
  const heroImage = (scraped.images || []).find(i => i && (/header|hero|banner|desk|main/i.test(i))) || realImages[0] || null;

  const baseCSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font-body);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased;overflow-x:hidden}.container{max-width:1400px;margin:0 auto;padding:0 2rem}@media(max-width:768px){.container{padding:0 1.25rem}}section{position:relative;z-index:1}img{max-width:100%;height:auto}a{text-decoration:none}.bento{display:grid;grid-template-columns:1fr 1fr;gap:1rem}@media(max-width:768px){.bento{grid-template-columns:1fr}}.bento-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-card);padding:2rem;position:relative;overflow:hidden;transition:border-color .3s,transform .35s var(--ease)}.bento-card:hover{border-color:var(--border-h);transform:translateY(-2px)}.bento-card.wide{grid-column:1/-1}.bento-card.tall{grid-row:span 2}.section{padding:7rem 0}.section-sm{padding:4rem 0}.section-label{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-40);font-family:var(--font-mono);margin-bottom:1rem}.section-title{font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1rem}.section-sub{font-size:1rem;color:var(--text-60);line-height:1.65;max-width:46ch}.cta-card{background:var(--surface2);border:1px solid var(--border);border-radius:calc(var(--radius-card)*1.25);padding:5rem 4rem;text-align:center;position:relative;overflow:hidden}.cta-card::before{content:'';position:absolute;top:-150px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,${colors.primary}40,transparent 70%);pointer-events:none}@media(max-width:768px){.cta-card{padding:3rem 1.5rem}.bento-card.wide,.bento-card.tall{grid-column:auto;grid-row:auto}}.stats-bar{border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:3rem 0}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}@media(max-width:640px){.stats-grid{grid-template-columns:repeat(2,1fr)}}.stat-item{padding:0 2rem;border-right:1px solid var(--border)}.stat-item:first-child{padding-left:0}.stat-item:last-child{border-right:none}.stat-num{font-family:var(--font-display);font-size:clamp(1.875rem,3.5vw,2.5rem);font-weight:800;letter-spacing:-.04em;line-height:1;margin-bottom:.375rem}.stat-num span{color:var(--accent)}.stat-desc{font-size:13px;color:var(--text-40);line-height:1.4}.eyebrow{display:inline-flex;align-items:center;gap:.5rem;border:1px solid var(--border-h);border-radius:var(--radius-pill);padding:.375rem .875rem;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-40);margin-bottom:1.75rem;font-family:var(--font-mono)}.eyebrow-dot{width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse-dot 2s ease-in-out infinite}@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}footer{position:relative;z-index:1;border-top:1px solid var(--border);padding:3.5rem 0 2.5rem}.footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3rem}@media(max-width:768px){.footer-grid{grid-template-columns:1fr 1fr;gap:2rem}}.footer-col h4{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-40);font-family:var(--font-mono);margin-bottom:1rem}.footer-col ul{list-style:none}.footer-col li{margin-bottom:.5rem}.footer-col a{font-size:14px;color:var(--text-60);transition:color .2s}.footer-col a:hover{color:var(--text)}.footer-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding-top:2rem;border-top:1px solid var(--border)}.footer-bottom p{font-size:12px;color:var(--text-40);font-family:var(--font-mono)}.footer-legal{display:flex;gap:1.5rem}.footer-legal a{font-size:12px;color:var(--text-40);font-family:var(--font-mono);transition:color .2s}.footer-legal a:hover{color:var(--text-60)}.bento-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;font-size:20px;background:color-mix(in srgb,var(--accent) 15%,transparent)}.steps{display:flex;flex-direction:column;gap:1.5rem}.step{display:flex;gap:1.5rem;align-items:flex-start}.step-num{width:40px;height:40px;flex-shrink:0;border-radius:50%;background:var(--card-bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:13px;color:var(--accent)}.testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}@media(max-width:768px){.testimonial-grid{grid-template-columns:1fr}}.testimonial-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-card);padding:1.75rem}`;

  return { cssVarsStr, googleFonts, moduleCSS, baseCSS, meshHTML: meshData.html, navHTML, moduleScripts, heroImage, realImages, logoHTML };
}

// ════════════════════════════════════════════════════════
// CHAMADA 3 — BUILD (model generates ONLY section innerHTML)
// ════════════════════════════════════════════════════════
export async function runBuild(plan, blueprint, scraped, vibe, key, onProgress) {
  onProgress?.('Montando shell + gerando conteudo...');
  const skills = await loadSkills();
  const shell = buildHTMLShell(blueprint, plan, scraped, vibe);

  const sysPrompt = `Voce e um engenheiro frontend senior. Gere APENAS fragmentos HTML de conteudo — sem <!DOCTYPE>, sem <html>, sem <head>, sem <style>, sem <script>. O CSS e scripts ja estao prontos.

${skills.output ? 'REGRAS DE OUTPUT:\n' + skills.output.slice(0, 1000) : ''}

CLASSES CSS DISPONIVEIS (ja definidas):
.container .section .section-sm .section-label .section-title .section-sub
.bento .bento-card .wide .tall .bento-icon
.btn-primary .btn-icon .btn-secondary
.eyebrow .eyebrow-dot
.steps .step .step-num
.testimonial-grid .testimonial-card
.stats-bar .stats-grid .stat-item .stat-num .stat-desc
.bezel-outer .bezel-inner
.cta-card
.accordion-item .accordion-trigger .accordion-icon .accordion-content .accordion-body
footer .footer-grid .footer-col .footer-bottom .footer-legal

REGRAS:
- Hero layout SPLIT SCREEN: texto esquerda (60%), visual direita (40%). NUNCA centralizar.
- Botoes: classe .btn-primary com .btn-icon para seta ↗
- TODAS as secoes e elementos devem ter data-reveal e style="--stagger:N"
- NUNCA inventar URLs de imagem. Usar APENAS as fornecidas ou SVGs inline.
- NUNCA incluir <style> ou <script> tags
- Zero TODO, zero placeholder

ESTRUTURA OBRIGATORIA DA SECAO FEATURES — COPIAR E PREENCHER:
<section id="features" class="section">
  <div class="container">
    <div data-reveal style="--stagger:0">
      <div class="section-label">Diferenciais</div>
      <h2 class="section-title">[TITULO REAL]</h2>
    </div>
    <div class="bento" style="margin-top:3.5rem">
      <div class="bento-card" data-reveal style="--stagger:1">
        <div class="bento-icon" style="color:var(--accent)"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:.5rem">[FEATURE 1]</h3>
        <p style="color:var(--text);opacity:0.6;font-size:14px;line-height:1.6">[DESC 1]</p>
      </div>
      <div class="bento-card tall" data-reveal style="--stagger:2">
        <div class="bento-icon" style="color:var(--accent)"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 14l4-4 3 3 3-5 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:.5rem">[FEATURE 2]</h3>
        <p style="color:var(--text);opacity:0.6;font-size:14px;line-height:1.6">[DESC 2]</p>
      </div>
      <div class="bento-card wide" data-reveal style="--stagger:3">
        <div class="bento-icon" style="color:var(--accent)"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 8h8M6 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:.5rem">[FEATURE 3]</h3>
        <p style="color:var(--text);opacity:0.6;font-size:14px;line-height:1.6">[DESC 3]</p>
      </div>
      <div class="bento-card" data-reveal style="--stagger:4">
        <div class="bento-icon" style="color:var(--accent)"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:.5rem">[FEATURE 4]</h3>
        <p style="color:var(--text);opacity:0.6;font-size:14px;line-height:1.6">[DESC 4]</p>
      </div>
    </div>
  </div>
</section>
Substituir [FEATURE N] e [DESC N] com dados reais do blueprint. NUNCA usar 3 colunas iguais.`;

  const feats = blueprint.copy?.sections?.find(s => s.id === 'features')?.items || [];
  const about = blueprint.copy?.sections?.find(s => s.id === 'about') || {};
  const contact = blueprint.copy?.sections?.find(s => s.id === 'contact') || {};

  const userPrompt = `Empresa: ${blueprint.business.name} (${blueprint.business.sector})
Produto: ${blueprint.business.main_product}

COPY: Headline="${blueprint.copy.hero_headline}" Sub="${blueprint.copy.hero_sub}" CTA="${blueprint.copy.hero_cta}"
Features: ${feats.map((f, i) => `${i + 1}.${f.title}: ${f.desc}`).join(' | ')}
Sobre: ${about.content || ''}
Contato: Tel=${contact.phone || 'N/A'} Email=${contact.email || 'N/A'} End=${contact.address || 'N/A'}

HERO VISUAL (lado direito do split screen):
${shell.heroImage
    ? `Usar esta imagem real no hero:
<div class="hero-visual" data-reveal style="--stagger:3">
  <div class="bezel-outer"><div class="bezel-inner" style="padding:0;overflow:hidden">
    <img src="${shell.heroImage}" alt="${blueprint.business.name}" style="width:100%;max-height:480px;object-fit:cover;display:block;border-radius:inherit">
  </div></div>
</div>`
    : `Sem imagem — usar visual decorativo:
<div class="hero-visual" data-reveal style="--stagger:3">
  <div class="bezel-outer"><div class="bezel-inner" style="min-height:400px;background:linear-gradient(135deg,var(--primary),transparent);display:flex;align-items:center;justify-content:center">
    <span style="font-family:var(--font-display);font-size:4rem;font-weight:900;opacity:0.1;letter-spacing:-.05em">${(blueprint.business.name || 'X').slice(0, 3).toUpperCase()}</span>
  </div></div>
</div>`}

OUTRAS IMAGENS REAIS (usar nas secoes):
${shell.realImages.slice(0, 4).map((img, i) => `Img${i + 1}: ${img}`).join('\n')}
PROIBIDO: picsum.photos, lorempixel, placeholder.com, URLs inventadas.

SECOES (gerar nesta ordem, cada uma com data-reveal):
${(plan.sections || []).map((s, i) => `${i + 1}. ${s.id}: ${s.name} (${s.layout || 'auto'})`).join('\n')}

Gerar fragmentos HTML de TODAS as secoes agora. Comecar com hero, terminar com footer.`;

  onProgress?.('Gerando conteudo das secoes...');
  const raw = await callOR(key, MODELS.build, sysPrompt, userPrompt, 7000, TIMEOUTS.build);

  // Strip any wrapper tags the model might have added
  let sections = raw
    .replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<\/?body[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/^```(?:html)?\n?/gm, '').replace(/\n?```$/gm, '')
    .trim();

  // Assemble final HTML: CODE shell + MODEL sections
  const finalHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blueprint.business.name} — ${blueprint.copy.hero_headline}</title>
  <meta name="description" content="${blueprint.copy.hero_sub}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${shell.googleFonts}" rel="stylesheet">
  <style>
:root {
${shell.cssVarsStr}
}
${shell.baseCSS}
${shell.moduleCSS}
  </style>
</head>
<body>
${shell.meshHTML}
${shell.navHTML}
<main>
${sections}
</main>
<script>
${shell.moduleScripts}
</script>
</body>
</html>`;

  onProgress?.(`HTML montado: ${finalHTML.length} chars`);
  return finalHTML;
}

// ════════════════════════════════════════════════════════
// CHAMADA 4 — FIX (now receives scraped for image injection)
// ════════════════════════════════════════════════════════
export async function runFix(html, audit, blueprint, scraped, key, onProgress) {
  onProgress?.('Verificando violacoes...');
  const violations = detectViolations(html, blueprint);
  const criticals = (audit.problems || []).filter(p => p.severity === 'critical').map(p => `[${p.category}] ${p.fix}`);
  const allViolations = [...violations, ...criticals];

  let result = html;
  if (allViolations.length > 0) {
    const skills = await loadSkills();
    const raw = await callOR(key, MODELS.fix, buildFixSystemPrompt(skills),
      `Corrija APENAS estas violacoes:\n${allViolations.join('\n')}\n\nHTML:\n${html}`,
      8000, TIMEOUTS.fix);
    const dm = raw.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    if (dm) result = dm[0];
    else if (raw.includes('<!DOCTYPE')) result = raw;
    // Fallback: if fix broke it, keep original
    if (!result.includes('<!DOCTYPE')) result = html;
    onProgress?.('Fix concluido');
  } else {
    onProgress?.('Nenhuma violacao — aprovado');
  }

  // Inject real images replacing any picsum
  result = injectRealImages(result, scraped, blueprint);
  return result;
}

function injectRealImages(html, scraped, blueprint) {
  let result = html;
  // Replace picsum with real images
  if (result.includes('picsum.photos') && scraped.images?.length > 0) {
    let idx = 0;
    result = result.replace(/https:\/\/picsum\.photos[^\s"')]+/g, () => scraped.images[idx++ % scraped.images.length] || '');
  }
  return result;
}

// ════════════════════════════════════════════════════════
// PIPELINE COMPLETO
// ════════════════════════════════════════════════════════
export async function runFullPipeline(scraped, blueprint, vibe, key, onProgress) {
  const progress = (stepId, detail) => onProgress?.({ stepId, detail, pct: { audit: 10, plan: 30, build: 60, fix: 90, done: 100 }[stepId] || 0 });
  try {
    progress('audit', 'Auditando...');
    const audit = await runAudit(scraped, key, d => progress('audit', d));
    progress('plan', 'Planejando...');
    const plan = await runPlan(scraped, blueprint, audit, vibe, key, d => progress('plan', d));
    progress('build', 'Gerando HTML...');
    const html = await runBuild(plan, blueprint, scraped, vibe, key, d => progress('build', d));
    progress('fix', 'Corrigindo...');
    const fixedHtml = await runFix(html, audit, blueprint, scraped, key, d => progress('fix', d));
    const auditResult = auditHTML(fixedHtml, blueprint);
    progress('done', `${auditResult.score} checks`);
    return { html: fixedHtml, audit, plan, auditResult };
  } catch (e) { throw new Error(`Pipeline: ${e.message}`); }
}

// ═══ HELPERS ═══
function detectViolations(html, bp) {
  const v = [];
  if (html.includes('picsum.photos')) v.push('CRITICO: Remover picsum.photos');
  if (/'Inter'|"Inter"/i.test(html)) v.push('CRITICO: Remover font Inter');
  if (html.includes('height: 100vh') && !html.includes('100dvh')) v.push('CRITICO: height:100vh → min-height:100dvh');
  if (!html.includes('data-reveal')) v.push('MAIOR: Adicionar data-reveal nos elementos');
  if ((html.match(/grid-template-columns:\s*repeat\(3/g) || []).length > 0) v.push('MAIOR: Trocar grid repeat(3) por bento');
  if (!/<footer/i.test(html)) v.push('CRITICO: Adicionar footer');
  return v;
}

function auditHTML(html, bp) {
  const n = bp.business?.name ? new RegExp(bp.business.name.split(/\s+/)[0], 'i') : /./;
  const checks = [
    { label: 'Nome da empresa', pass: n.test(html) },
    { label: 'DOCTYPE', pass: /<!DOCTYPE html/i.test(html) },
    { label: '100dvh', pass: /100dvh/.test(html) },
    { label: 'data-reveal', pass: /data-reveal/.test(html) },
    { label: 'IntersectionObserver', pass: /IntersectionObserver/.test(html) },
    { label: 'Grain overlay', pass: /body::after|feTurbulence/i.test(html) },
    { label: 'Floating nav', pass: /nav-island/.test(html) },
    { label: 'Mesh gradient', pass: /mesh-orb/.test(html) },
    { label: 'Footer', pass: /<footer/i.test(html) },
    { label: 'Zero picsum', pass: !html.includes('picsum.photos') },
    { label: 'Zero TODO', pass: !/\/\/\s*TODO/i.test(html) },
    { label: 'Zero Inter', pass: !/'Inter'|"Inter"/i.test(html) },
    { label: 'Google Fonts', pass: /fonts\.googleapis/.test(html) },
    { label: 'CSS Variables', pass: /:root/.test(html) },
  ];
  const passed = checks.filter(c => c.pass).length;
  return { checks, score: `${passed}/${checks.length}`, allPassed: passed === checks.length };
}
