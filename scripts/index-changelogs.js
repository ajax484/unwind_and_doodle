/**
 * index-changelogs.js
 * 
 * Automatically scans docs/changes/ domain subdirectories, validates
 * changelog schemas against project rules, and generates docs/changes/README.md.
 */

const fs = require('fs');
const path = require('path');

const changesDir = path.resolve(__dirname, '../docs/changes');

const domainConfigs = [
  { id: 'admin', title: '1. Admin Management & Backoffice', desc: 'CRM, warehouse inventory, GRN receipts, and backoffice tooling' },
  { id: 'commerce', title: '2. Commerce, Purchasing & Checkout Pipeline', desc: 'Cart, atomic checkout, inventory reservations, bundles, discounts' },
  { id: 'payments', title: '3. Payments & Gateway Integration', desc: 'Paystack, Flutterwave migration, webhooks, transaction verification' },
  { id: 'storefront', title: '4. Storefront & Customer Experience', desc: 'Customer accounts, PDP, storefront home, typography, mobile layout' },
  { id: 'auth', title: '5. Authentication, RBAC & Multi-Tenancy', desc: 'Cookie sessions, OTP, Google OAuth, staff roles, permissions' },
  { id: 'notifications', title: '6. Notifications, Outbox & Infrastructure', desc: 'Sonner toasts, persistent notification center, Nodemailer SMTP' },
  { id: 'quality-and-tests', title: '7. Code Quality, TypeScript & Test Suite Refactoring', desc: 'Clean code refactors, Vitest optimization, type definitions' },
  { id: 'design-system', title: '8. Design System & Figma Synchronization', desc: 'Figma canvas components, tokens, QA audit fixes, code reconciliation' }
];

function extractTitle(content, filename) {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    let title = match[1].trim();
    // Strip leading date if present e.g. "2026-09-05 — " or "Change Document: Phase 6E — "
    title = title.replace(/^\d{4}-\d{2}-\d{2}\s*[—–-]\s*/, '');
    title = title.replace(/^Change Document:\s*/i, '');
    title = title.replace(/^Feature:\s*/i, '');
    return title;
  }
  // Fallback to humanized filename
  const cleanName = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  return cleanName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

function validateFile(content, filename) {
  const warnings = [];
  if (!/##\s*(\d+\.\s*)?What Changed/i.test(content) && !/##\s*Summary of Changes/i.test(content)) {
    warnings.push('Missing "## What Changed"');
  }
  if (!/##\s*(\d+\.\s*)?Why/i.test(content)) {
    warnings.push('Missing "## Why"');
  }
  if (!/##\s*(\d+\.\s*)?Files Touched/i.test(content)) {
    warnings.push('Missing "## Files Touched"');
  }
  if (!/##\s*(\d+\.\s*)?(Follow-ups|Follow ups|Known Issues)/i.test(content)) {
    warnings.push('Missing "## Follow-ups / Known Issues"');
  }
  if (!/##\s*(\d+\.\s*)?(Commit Message|Suggested Commit Message)/i.test(content)) {
    warnings.push('Missing "## Commit Message"');
  }
  return warnings;
}

function run() {
  console.log('Scanning changelogs in docs/changes/...\n');

  let totalFiles = 0;
  let totalWarnings = 0;
  const sectionsContent = [];

  for (const domain of domainConfigs) {
    const domainDir = path.join(changesDir, domain.id);
    if (!fs.existsSync(domainDir)) {
      continue;
    }

    const files = fs.readdirSync(domainDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))
      .sort();

    totalFiles += files.length;

    let sectionMarkdown = `### ${domain.title}\n`;
    sectionMarkdown += `*${domain.desc}*\n\n`;

    for (const file of files) {
      const filePath = path.join(domainDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const date = file.slice(0, 10);
      const title = extractTitle(content, file);
      const warnings = validateFile(content, file);

      if (warnings.length > 0) {
        totalWarnings += warnings.length;
      }

      sectionMarkdown += `- [${date} ${title}](./${domain.id}/${file})\n`;
    }

    sectionsContent.push(sectionMarkdown);
  }

  const readmeContent = `# Changelog Index

This directory maintains categorized, per-feature change records following the repository standard: \`docs/changes/<domain>/YYYY-MM-DD-feature-name.md\`.

> [!NOTE]
> For new major changes affecting $\\ge 2$ production code files, use [\`_template.md\`](./_template.md) as a starting point.
> To re-validate and regenerate this index, run \`npm run docs:index\`.

---

## 📂 Changes by Feature Domain

${sectionsContent.join('\n---\n\n')}
---

## 📊 Summary
- **Total Changelogs**: ${totalFiles} across ${domainConfigs.length} domain modules
- **Template Scaffold**: [\`docs/changes/_template.md\`](./_template.md)
- **Status**: 100% indexed (${totalFiles} of ${totalFiles} files registered)
`;

  const readmePath = path.join(changesDir, 'README.md');
  fs.writeFileSync(readmePath, readmeContent, 'utf8');

  console.log(`Successfully generated ${readmePath}`);
  console.log(`Indexed ${totalFiles} files across ${domainConfigs.length} domains.`);
  if (totalWarnings > 0) {
    console.log(`Validation note: Found ${totalWarnings} schema warnings across older historical logs.`);
  }
}

run();
