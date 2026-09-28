#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const DESCRIPTION = 'Universal Acceptance rules for validating, storing, displaying or linking email addresses, domain names and URLs. Use when writing or reviewing any code that handles those values: long or new TLDs, internationalized domain names (IDN), internationalized email (EAI).';

export function render(guide) {
  const start = guide.indexOf('## What is valid');
  if (start === -1) throw new Error('GUIDE.md has no "## What is valid" heading: nothing to embed');
  const body = guide.slice(start).trimEnd() + '\n';
  // The licence travels in every copied adapter, since the guide's own header line is not embedded.
  const generated = '<!-- generated from GUIDE.md by scripts/build-adapters.mjs — do not edit. Licence: CC BY 4.0, https://github.com/guia-matthieu/ua-agent-kit -->\n';
  return {
    // No `license` key here: the spec's §10 frontmatter is name + description only, and the plan's
    // Step 2 test anchors exactly that shape. Licence coverage comes from LICENSE-GUIDE.md and the
    // guide header (docs/qc/notes-task-08.md).
    'adapters/claude-code/SKILL.md': `---\nname: ua-ready-validation\ndescription: ${DESCRIPTION}\n---\n\n${generated}# Universal Acceptance for email, domain and URL handling\n\n${body}`,
    'adapters/cursor/ua-ready-validation.mdc': `---\ndescription: ${DESCRIPTION}\nglobs: ["**/*.{js,jsx,ts,tsx,mjs,cjs,py,php,rb,go,java,kt,cs,html,vue,svelte}"]\nalwaysApply: false\n---\n\n${generated}${body}`,
    'adapters/AGENTS.md': `${generated}## Universal Acceptance (email, domain and URL validation)\n\n${body}`,
    'adapters/copilot-instructions.md': `${generated}# Universal Acceptance for email, domain and URL handling\n\n${body}`
  };
}

export function buildAdapters({ check = false, root = ROOT } = {}) {
  const guide = readFileSync(new URL('GUIDE.md', root), 'utf8');
  const out = render(guide);
  const changed = [];
  for (const [rel, text] of Object.entries(out)) {
    const abs = fileURLToPath(new URL(rel, root));
    const current = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (current !== text) {
      changed.push(rel);
      if (!check) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, text); }
    }
  }
  return { changed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const { changed } = buildAdapters({ check });
  if (check && changed.length) { console.error(`adapters out of date: ${changed.join(', ')} — run npm run build:adapters`); process.exit(1); }
  console.log(check ? 'adapters up to date' : `built ${Object.keys(render('## What is valid')).length} adapters`);
}
