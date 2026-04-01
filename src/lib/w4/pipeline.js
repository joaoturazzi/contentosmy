// ─────────────────────────────────────────────────────
// WS4 — PIPELINE DE 4 CHAMADAS
// AUDIT → PLAN → BUILD → FIX
// ─────────────────────────────────────────────────────

import { loadSkills, buildAuditSystemPrompt, buildPlanSystemPrompt, buildBuildSystemPrompt, buildFixSystemPrompt } from './skills-loader.js';
import { CinematicModules } from './cinematic-modules.js';

// Modelos por etapa — usar Gemini Flash (testado: funciona e é rápido)
const MODELS = {
  audit: 'google/gemini-2.0-flash-001',
  plan:  'google/gemini-2.0-flash-001',
  build: 'google/gemini-2.0-flash-001',
  fix:   'google/gemini-2.0-flash-001',
};

const TIMEOUTS = { audit: 30000, plan: 45000, build: 120000, fix: 90000 };

// ── Helper: chamada OpenRouter com timeout ─────────────
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
      if (code === 401 || code === '401') throw new Error('API key OpenRouter invalida');
      if (code === 402 || code === '402') throw new Error('Creditos OpenRouter insuficientes');
      if (code === 429) throw new Error('Rate limit — aguarde 30s');
      throw new Error('OpenRouter: ' + (typeof d.error === 'string' ? d.error : d.error?.message || JSON.stringify(d.error)));
    }
    const content = d.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia de ' + model);
    return content;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout ${timeoutMs / 1000}s no ${model}`);
    throw e;
  } finally { clearTimeout(timer); }
}

// ── Helper: parse JSON robusto ─────────────────────────
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
// CHAMADA 1 — AUDIT
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
// CHAMADA 2 — PLAN
// ════════════════════════════════════════════════════════
export async function runPlan(scraped, blueprint, audit, vibe, key, onProgress) {
  onProgress?.('Planejando secoes...');
  const skills = await loadSkills();
  const critical = (audit.problems || []).filter(p => p.severity === 'critical' || p.severity === 'major').map(p => `- ${p.found} → ${p.fix}`).join('\n');
  const feats = blueprint.copy?.sections?.find(s => s.id === 'features')?.items || [];
  const about = blueprint.copy?.sections?.find(s => s.id === 'about') || {};
  const contact = blueprint.copy?.sections?.find(s => s.id === 'contact') || {};

  const raw = await callOR(key, MODELS.plan, buildPlanSystemPrompt(skills),
    `Plano de secoes:\n\nEMPRESA: ${blueprint.business.name} (${blueprint.business.sector})\nProduto: ${blueprint.business.main_product}\nHeadline: "${blueprint.copy.hero_headline}"\nSub: "${blueprint.copy.hero_sub}"\nCTA: "${blueprint.copy.hero_cta}"\nFeatures: ${feats.map(f => f.title).join(', ')}\nSobre: ${about.content || ''}\nContato: ${contact.phone || ''} ${contact.email || ''}\nCores: ${blueprint.brand.colors.primary} / ${blueprint.brand.colors.accent}\nFont: ${blueprint.brand.typography.display}\nVIBE: ${vibe}\nImagens: ${scraped.images?.slice(0, 4).join(', ') || 'nenhuma'}\n\nProblemas a corrigir:\n${critical || 'nenhum critico'}\n\nPlanejar 8 secoes: hero, stats, features(bento), about, setor-especifica, social_proof, cta, footer.\nRetorne JSON.`,
    2000, TIMEOUTS.plan);
  const plan = safeJSON(raw);
  if (!plan.sections || plan.sections.length < 3) throw new Error('Plano invalido — menos de 3 secoes');
  onProgress?.(`Plano: ${plan.sections.length} secoes`);
  return plan;
}

// ════════════════════════════════════════════════════════
// CHAMADA 3 — BUILD
// ════════════════════════════════════════════════════════
export async function runBuild(plan, blueprint, scraped, vibe, key, onProgress) {
  onProgress?.('Gerando HTML com modulos cinematicos...');
  const skills = await loadSkills();
  const modulesText = CinematicModules.serializeForPrompt({
    colors: blueprint.brand.colors,
    accentColor: blueprint.brand.colors.accent,
    surfaceColor: vibe === 'ethereal_glass' ? 'rgba(255,255,255,0.04)' : '#ffffff',
  });
  const sysPrompt = buildBuildSystemPrompt(skills, modulesText);
  const dFont = blueprint.brand.typography.display || 'Cabinet Grotesk';
  const bFont = blueprint.brand.typography.body || 'Outfit';
  const fontLink = buildFontLink(dFont);
  const cssVars = buildCSSVars(blueprint.brand.colors, vibe);
  const imgs = scraped.images?.length > 0
    ? `IMAGENS REAIS:\n${scraped.images.slice(0, 6).map((img, i) => `${i + 1}. ${img}`).join('\n')}\nPROIBIDO: picsum.photos`
    : 'NENHUMA IMAGEM. Usar SVGs inline. PROIBIDO: picsum.photos';

  const userPrompt = `Gere HTML completo. <!DOCTYPE html> ate </html>. Sem backticks.

EMPRESA: ${blueprint.business.name} — ${blueprint.business.sector}
FONT: ${dFont} / ${bFont}
GOOGLE FONTS: ${fontLink}
CSS VARS: ${Object.entries(cssVars).map(([k, v]) => k + ':' + v).join('; ')}
LOGO: ${blueprint.brand.logo_url && blueprint.brand.logo_url !== 'null' ? '<img src="' + blueprint.brand.logo_url + '" alt="' + blueprint.business.name + '" style="max-height:32px">' : '<span style="font-weight:800">' + blueprint.business.name + '</span>'}

${imgs}

SECOES DO PLANO:
${(plan.sections || []).map((s, i) => `${i + 1}. ${s.name} (${s.id}) — ${s.layout || 'auto'} — modulos: ${(s.modules || []).join(',')} — copy: ${JSON.stringify(s.copy || {})}`).join('\n')}

HEADLINE: "${blueprint.copy.hero_headline}"
SUB: "${blueprint.copy.hero_sub}"
CTA: "${blueprint.copy.hero_cta}"
FEATURES: ${JSON.stringify(blueprint.copy?.sections?.find(s => s.id === 'features')?.items || [])}
CONTATO: ${JSON.stringify(blueprint.copy?.sections?.find(s => s.id === 'contact') || {})}

Gere o HTML COMPLETO agora.`;

  const raw = await callOR(key, MODELS.build, sysPrompt, userPrompt, 10000, TIMEOUTS.build);
  let html = raw;
  const dm = raw.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (dm) html = dm[0];
  else { const cm = raw.match(/```html\n?([\s\S]*?)```/i); if (cm) html = cm[1].trim(); }
  if (!html.includes('<!DOCTYPE')) throw new Error('HTML sem DOCTYPE');
  onProgress?.(`HTML: ${html.length} chars`);
  return html;
}

// ════════════════════════════════════════════════════════
// CHAMADA 4 — FIX
// ════════════════════════════════════════════════════════
export async function runFix(html, audit, blueprint, key, onProgress) {
  onProgress?.('Verificando violacoes...');
  const violations = detectViolations(html, blueprint);
  const criticals = (audit.problems || []).filter(p => p.severity === 'critical').map(p => `[${p.category}] ${p.fix}`);
  const allViolations = [...violations, ...criticals];
  if (allViolations.length === 0) { onProgress?.('Nenhuma violacao — aprovado'); return html; }

  const skills = await loadSkills();
  const raw = await callOR(key, MODELS.fix, buildFixSystemPrompt(skills),
    `Corrija APENAS estas violacoes:\n${allViolations.join('\n')}\n\nHTML:\n${html}`,
    8000, TIMEOUTS.fix);
  let fixed = raw;
  const dm = raw.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (dm) fixed = dm[0];
  onProgress?.('Fix concluido');
  return fixed.includes('<!DOCTYPE') ? fixed : html; // fallback to original if fix broke it
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
    const fixedHtml = await runFix(html, audit, blueprint, key, d => progress('fix', d));

    const auditResult = auditHTML(fixedHtml, blueprint);
    progress('done', `${auditResult.score} checks`);

    return { html: fixedHtml, audit, plan, auditResult };
  } catch (e) { throw new Error(`Pipeline: ${e.message}`); }
}

// ═══ HELPERS ═══
function buildCSSVars(colors, vibe) {
  const bases = {
    ethereal_glass:    { '--bg': '#050505', '--surface': '#0d0d0d', '--text': '#fff', '--text-60': 'rgba(255,255,255,0.6)', '--border': 'rgba(255,255,255,0.08)' },
    editorial_luxury:  { '--bg': '#FDFBF7', '--surface': '#F4F1EB', '--text': '#111', '--text-60': 'rgba(0,0,0,0.6)', '--border': 'rgba(0,0,0,0.08)' },
    soft_structuralism:{ '--bg': '#F9FAFB', '--surface': '#fff', '--text': '#18181B', '--text-60': 'rgba(24,24,27,0.6)', '--border': 'rgba(226,232,240,0.5)' },
    minimalist:        { '--bg': '#F7F6F3', '--surface': '#fff', '--text': '#111', '--text-60': '#787774', '--border': '#EAEAEA' },
    brutalist:         { '--bg': '#F4F4F0', '--surface': '#EAEAE6', '--text': '#050505', '--text-60': 'rgba(5,5,5,0.6)', '--border': '#050505' },
  };
  return { ...(bases[vibe] || bases.ethereal_glass), '--primary': colors.primary || '#333', '--secondary': colors.secondary || '#555', '--accent': colors.accent || '#fff' };
}

function buildFontLink(displayFont) {
  const m = { 'Cabinet Grotesk': 'Cabinet+Grotesk:wght@400;500;700;800;900', 'Outfit': 'Outfit:wght@300;400;500;600;700;800;900', 'Geist': 'Geist:wght@300;400;500;600;700;800', 'Fraunces': 'Fraunces:wght@400;700;900', 'Instrument Serif': 'Instrument+Serif:wght@400;700', 'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;500;600;700;800', 'Clash Display': 'Clash+Display:wght@400;500;600;700' };
  return `https://fonts.googleapis.com/css2?family=${m[displayFont] || 'Cabinet+Grotesk:wght@400;700;900'}&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`;
}

function detectViolations(html, bp) {
  const v = [];
  if (html.includes('picsum.photos')) v.push('CRITICO: Remover picsum.photos');
  if (/'Inter'|"Inter"/i.test(html)) v.push('CRITICO: Remover font Inter → usar ' + (bp.brand?.typography?.display || 'Cabinet Grotesk'));
  if (html.includes('height: 100vh') && !html.includes('100dvh')) v.push('CRITICO: height:100vh → min-height:100dvh');
  if (!html.includes('data-reveal')) v.push('MAIOR: Adicionar data-reveal nos elementos');
  if (!html.includes('IntersectionObserver')) v.push('MAIOR: Adicionar IntersectionObserver script');
  if (!html.includes('body::after') && !html.includes('feTurbulence')) v.push('MAIOR: Adicionar grain overlay');
  if ((html.match(/grid-template-columns:\s*repeat\(3/g) || []).length > 0) v.push('MAIOR: Trocar grid repeat(3) por bento assimetrico');
  if (!/<footer/i.test(html)) v.push('CRITICO: Adicionar footer com dados reais');
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
    { label: 'Footer', pass: /<footer/i.test(html) },
    { label: 'Zero picsum', pass: !html.includes('picsum.photos') },
    { label: 'Zero TODO', pass: !/\/\/\s*TODO/i.test(html) },
    { label: 'Zero Inter', pass: !/'Inter'|"Inter"/i.test(html) },
    { label: 'Cores da marca', pass: new RegExp(bp.brand?.colors?.primary?.replace('#', ''), 'i').test(html) },
    { label: 'Google Fonts', pass: /fonts\.googleapis/.test(html) },
  ];
  const passed = checks.filter(c => c.pass).length;
  return { checks, score: `${passed}/${checks.length}`, allPassed: passed === checks.length };
}
