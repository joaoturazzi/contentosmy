// ─────────────────────────────────────────────────────
// WS4 — SKILLS LOADER
// Loads skill .md files and provides them for prompt injection.
// Skills are loaded from local files in src/lib/skills/
// ─────────────────────────────────────────────────────

// Skills are stored locally (downloaded from github.com/joaoturazzi/taste-skill)
// We read them at import time since they're bundled with the app
// Skills loaded as raw strings via webpack config (next.config.mjs: asset/source for .md)
import tasteSkill from '../skills/taste-skill.md';
import redesignSkill from '../skills/redesign-skill.md';
import outputSkill from '../skills/output-skill.md';
import softSkill from '../skills/soft-skill.md';
import minimalistSkill from '../skills/minimalist-skill.md';
import brutalistSkill from '../skills/brutalist-skill.md';

const SKILLS_MAP = {
  taste: tasteSkill || null,
  redesign: redesignSkill || null,
  output: outputSkill || null,
  soft: softSkill || null,
  minimalist: minimalistSkill || null,
  brutalist: brutalistSkill || null,
};

// Cache
let _cache = null;

export async function loadSkills() {
  if (_cache) return _cache;

  _cache = {};
  for (const [name, content] of Object.entries(SKILLS_MAP)) {
    if (content && content.length > 50) {
      _cache[name] = content;
    }
  }

  // If static imports failed, try fetching from GitHub as fallback
  if (Object.keys(_cache).length === 0) {
    const GITHUB_BASE = 'https://raw.githubusercontent.com/joaoturazzi/taste-skill/main/skills';
    const paths = {
      taste: `${GITHUB_BASE}/taste-skill/SKILL.md`,
      redesign: `${GITHUB_BASE}/redesign-skill/SKILL.md`,
      output: `${GITHUB_BASE}/output-skill/SKILL.md`,
      soft: `${GITHUB_BASE}/soft-skill/SKILL.md`,
      minimalist: `${GITHUB_BASE}/minimalist-skill/SKILL.md`,
      brutalist: `${GITHUB_BASE}/brutalist-skill/SKILL.md`,
    };

    const results = await Promise.allSettled(
      Object.entries(paths).map(async ([name, url]) => {
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return [name, await r.text()];
        } catch (e) {
          console.warn(`[skills-loader] Failed to load ${name}: ${e.message}`);
          return [name, null];
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value[1]) {
        _cache[result.value[0]] = result.value[1];
      }
    }
  }

  const loaded = Object.keys(_cache).length;
  console.log(`[skills-loader] ${loaded}/6 skills loaded`);
  return _cache;
}

// ── Montar system prompt de AUDIT (redesign-skill) ─────
export function buildAuditSystemPrompt(skills) {
  return `
Voce e um auditor senior de design frontend.
Sua unica tarefa e analisar o conteudo de um site e listar problemas.

Aplique estas regras de auditoria com rigor absoluto:

${skills.redesign || ''}

FORMATO DE SAIDA OBRIGATORIO — responder APENAS com JSON:
{
  "problems": [
    { "category": "typography|color|layout|content|interaction|performance",
      "severity": "critical|major|minor",
      "found": "descricao exata do que foi encontrado",
      "fix": "solucao especifica a aplicar" }
  ],
  "sector_detected": "setor do negocio",
  "vibe_recommended": "ethereal_glass|editorial_luxury|soft_structuralism",
  "vibe_reason": "motivo da recomendacao"
}`.trim();
}

// ── Montar system prompt de PLAN ───────────────────────
export function buildPlanSystemPrompt(skills) {
  return `
Voce e um arquiteto de experiencias digitais.
Sua tarefa e criar um plano estruturado de site, nao o codigo.

${skills.taste || ''}
${skills.soft || ''}

FORMATO DE SAIDA OBRIGATORIO — responder APENAS com JSON:
{
  "sections": [
    {
      "id": "identificador",
      "name": "nome da secao",
      "purpose": "objetivo desta secao",
      "content": {},
      "layout": "split|bento|full-width|etc",
      "modules": ["grain", "scrollReveal", "doubleBevel"],
      "copy": { "headline": "...", "sub": "...", "cta": "..." }
    }
  ],
  "css_vars": {
    "--bg": "cor", "--surface": "cor", "--text": "cor",
    "--accent": "cor", "--border": "rgba(...)"
  }
}`.trim();
}

// ── Montar system prompt de BUILD ──────────────────────
export function buildBuildSystemPrompt(skills, modules) {
  return `
Voce e um engenheiro frontend senior especialista em HTML/CSS cinematografico.

REGRAS ABSOLUTAS DE OUTPUT:
${skills.output || ''}

REGRAS VISUAIS — SEGUIR COM PRECISAO:
${skills.taste || ''}

REGRAS DE DESIGN PREMIUM:
${skills.soft || ''}

MODULOS PRONTOS — USE EXATAMENTE COMO FORNECIDOS:
${modules}

REGRAS DE CODIGO:
- Responder APENAS com HTML completo. Comecar com <!DOCTYPE html>
- Zero markdown, zero explicacoes fora do HTML
- Zero TODO, zero placeholder, zero "adicione aqui"
- Zero picsum.photos, zero imagens aleatorias
- Zero font-family: Inter, Roboto, Arial, Helvetica
- SEMPRE min-height: 100dvh (nunca height: 100vh)
- SEMPRE floating island navbar (nunca full-width colada no topo)
- NUNCA 3 cards iguais em linha — usar bento assimetrico`.trim();
}

// ── Montar system prompt de FIX ────────────────────────
export function buildFixSystemPrompt(skills) {
  return `
Voce e um revisor de codigo frontend.
Voce recebe HTML gerado e uma lista de violacoes.
Sua tarefa e corrigir APENAS as violacoes listadas, sem alterar o resto.

${skills.output || ''}

RESPONDER APENAS COM O HTML CORRIGIDO. Sem explicacoes.`.trim();
}

// ── Status das skills carregadas ──────────────────────
export async function getSkillsStatus() {
  const skills = await loadSkills();
  return ['taste', 'redesign', 'output', 'soft', 'minimalist', 'brutalist'].map(name => ({
    name,
    loaded: !!skills[name],
    size: skills[name] ? skills[name].length + ' chars' : 'not loaded',
    lines: skills[name] ? skills[name].split('\n').length + ' lines' : '0',
  }));
}
