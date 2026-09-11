---
name: design-system-migration
description: >-
  Audit pages or features to replace standalone, duplicated, or page-specific UI
  implementations with canonical Unwind & Doodle design-system components and tokens
  without altering intended UX, content, functionality, or information architecture.
---

# Design System Migration Workflow

Standardized procedure and operational guidelines for auditing pages, views, or features and replacing standalone, duplicated, or page-specific UI implementations with canonical Unwind & Doodle design-system components and tokens — **without altering intended UX, content, layout hierarchy, business logic, or functionality**.

> [!NOTE]
> Canonical documentation counterpart is maintained at [`docs/design-system/migration-workflow.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/design-system/migration-workflow.md).

---

## Target Scope Template

At the start of every migration task, initialize the following metadata block:

```markdown
## Migration Target

**Page / View:** `[ROUTE_OR_PAGE_PATH]` (e.g., `src/app/(storefront)/products/[slug]/page.tsx`)
**Primary Scope:** `[PAGE_COMPONENT_OR_MODULE]`
**Design System Target:** Unwind & Doodle Design System (`src/components/`, `src/app/globals.css`)
**Breakpoint Baseline:** Mobile (375px–480px), Tablet (768px–1024px), Desktop (1280px+)
```

---

## Core Objective & Philosophy

Audit the target page or feature and systematically replace standalone, duplicated, or page-specific UI implementations with canonical Unwind & Doodle design-system components and tokens.

The goal is to bring the page into consistent alignment with the design system **without changing the intended UX, content, functionality, or information architecture**.

### Tri-Directional Alignment

```text
Design System Tokens & Components (Canonical UI Building Blocks)
   │
   ▼
Page Implementation (Canonical Behavior, UX & Content Invariants)
   │
   ▼
Post-Migration Verification (Multi-Breakpoint, TypeScript & Tests)
```

- **Design System** provides canonical visual appearance, tokens, and accessible interactive primitives.
- **Existing Page Implementation** is the canonical specification for **behavior, content, and UX flows**, unless an intentional design-system alignment is required.
- Do not redesign the page.
- Do not make unrelated architectural refactors or improvements outside migration scope.

---

## 6-Stage Core Workflow

```text
1. Inspect & Audit  → Inventory page JSX, standalone UI, raw CSS, and behavior baselines
2. Resolve & Map    → Map standalone UI to canonical design-system components & tokens
3. Invariant Check  → Secure state, event handlers, and UX/responsive invariants
4. Migrate Code     → Replace standalone markup; apply variants, props, and tokens
5. Validate         → Multi-breakpoint checks, TypeScript checks, and test suite execution
6. Report           → Generate standardized 6-section Migration Report
```

---

## Stage 1: Pre-Flight Audit (Inspect Before Editing)

> [!IMPORTANT]
> **Do not modify code during this phase.** Inspect the existing implementation thoroughly to build an exact mental mapping:
> `Existing standalone UI → Existing design-system component`

### 1. Codebase & Structure Inspection
Inspect the target page and its imported subcomponents:
- The existing page/component structure and hierarchy.
- Local state (`useState`, `useReducer`), hooks, and context consumers (`useCart`, `useAuth`, etc.).
- Inline styles, utility classes, and custom CSS rules.
- Existing design-system component usage elsewhere across the application to observe established patterns.

### 2. Comprehensive UI Inventory Checklist
Check all UI elements against the design system taxonomy:
- **Actions & Links**: Buttons, icon buttons, text links, button groups.
- **Form Controls**: Text inputs, search controls, textareas, native/custom selects, checkboxes, radio buttons, form labels, helper text, validation feedback.
- **Badges & Indicators**: Badges, inventory tags, order status components, notification counts.
- **Commerce Elements**: Product cards, cart items, quantity controls, pricing displays, discount tags.
- **Feedback & Overlays**: Modals, dialogs, drawers, dropdowns, tooltips, alerts, toast notifications.
- **States**: Empty states, loading states (spinners, skeletons), error states.
- **Navigation & Structure**: Navigation bars, tabs, breadcrumbs, pagination, cards, section headers.
- **Specialized Patterns**: Rating stars, testimonials, uploaders (e.g. `CustomizationUploader`), stock notification controls, repeated layout or interaction patterns.
- Also identify visually similar components that may have been implemented independently under different names.

### 3. Design Token Inspection
Identify hardcoded design values across the component:
- Raw hex colors (`#...`).
- Arbitrary font sizes and font weights.
- Arbitrary spacing (`p-[13px]`, `gap-[7px]`).
- Arbitrary border radii (`rounded-[14px]`).
- Arbitrary shadows (`shadow-[0_4px_12px_...]`).
- Duplicate CSS values and page-specific color definitions.

### 4. Responsive Baseline
Document how the component currently behaves across viewports:
- Desktop (`>= 1280px`)
- Tablet (`768px - 1024px`)
- Mobile (`375px - 480px`)

---

## Stage 2: Component Resolution & Reuse Ladder

For every standalone UI element, determine whether an existing design-system component can replace it using this strict 5-tier evaluation hierarchy:

```text
┌────────────────────────────────────────────────────────┐
│ 1. Exact existing design-system component              │
└───────────────────────────┬────────────────────────────┘
                            │ (if variant/size needed)
┌───────────────────────────▼────────────────────────────┐
│ 2. Existing component with appropriate variant/size    │
└───────────────────────────┬────────────────────────────┘
                            │ (if props need wiring)
┌───────────────────────────▼────────────────────────────┐
│ 3. Existing component accepting required props         │
└───────────────────────────┬────────────────────────────┘
                            │ (if non-breaking extension)
┌───────────────────────────▼────────────────────────────┐
│ 4. Extend existing component with props or variants    │
└───────────────────────────┬────────────────────────────┘
                            │ (if reusable pattern missing)
┌───────────────────────────▼────────────────────────────┐
│ 5. Create new design-system component (Governed)       │
│    *Or retain as local page component if truly unique   │
└────────────────────────────────────────────────────────┘
```

### Resolution Rules:
- **Do not create a new component** simply because the existing implementation is slightly different. Prefer adapting the existing component through props or variants.
- **Do not duplicate components**: Never create standalone wrappers like `PrimaryButton`, `SecondaryButton`, `DangerButton`, or `SmallButton` when the canonical `Button` supports variants (`primary`, `secondary`, `outline`, `ghost`, `danger`) and sizes (`sm`, `md`, `lg`).
- **Use existing variants** for product cards, badges, inputs, buttons, order statuses, cards, and navigation elements.
- **Do not create aliases** simply to preserve old component names.

---

## Stage 3: Invariant Preservation Protocol

Replacing a standalone component must never break existing functionality or UX. The migration is primarily a **presentation/component architecture change**, not a feature rewrite.

### Behavior Invariants to Preserve:
- Event handlers (`onClick`, `onChange`, `onSubmit`, `onKeyDown`, etc.).
- Form behavior and validation rules (Zod schemas, error states, required constraints).
- State management (local state, context providers, store subscriptions).
- Loading behavior and optimistic updates.
- Error handling and fallback rendering.
- Accessibility semantics, keyboard interactions, and focus management.
- Responsive behavior across breakpoints.
- Analytics/tracking callbacks and telemetry hooks.
- API interactions, React Query caching/invalidation, and Supabase service route requests.
- Authentication state, role guards, and navigation redirects.
- Existing business logic.

### UX Invariants to Preserve:
- Do not redesign the page during this migration.
- Information hierarchy and reading order.
- Exact content, copy, and iconography semantics.
- User flows and conversion funnels.
- Call-To-Action (CTA) placement and prominence.
- Interaction patterns (e.g. drawer vs modal, inline expand vs accordion).
- Component sizing where compatible.
- Page structure and responsive layout.

*If the existing UI differs from the design-system component, determine whether the difference is intentional before changing it.*

---

## Stage 4: Code Migration & Token Consolidation

Execute replacements cleanly and idiomatic to TypeScript and Tailwind CSS:

### 1. TypeScript Standards
- Prefer proper interfaces and types exported from design-system components.
- Prefer type inference over explicit redundant annotations.
- Prefer type guards where narrowing is required.
- Ensure props are correctly typed.
- **Avoid unnecessary `as` assertions** (e.g., `as any`, `as unknown`).
- **Do not use verbose casts** such as `as Record<string, unknown>` unless genuinely required by the underlying API.
- Keep the resulting TypeScript clean, expressive, and idiomatic.

### 2. Design Token Consolidation
During migration, replace hardcoded design values with existing design tokens:
- **Raw hex colors** $\rightarrow$ Semantic tokens (e.g., `text-content-primary`, `bg-action-primary`, `var(--color-...)`).
- **Arbitrary font sizes & weights** $\rightarrow$ Typography scale tokens (`text-heading-lg`, `text-body-md`, `font-fredoka`, `font-sans`).
- **Arbitrary spacing** $\rightarrow$ Design token spacing scale (`gap-4`, `p-6`, `space-y-3`).
- **Arbitrary border radii** $\rightarrow$ Radius tokens (`rounded-pill`, `rounded-card`, `rounded-lg`).
- **Arbitrary shadows** $\rightarrow$ Shadow tokens (`shadow-card`, `shadow-action-rose`, `shadow-dropdown`).
- Do not introduce a new token when an existing token already represents the value.
- If a new token is genuinely required, report it before introducing it.

---

## Stage 5: Missing Component & Extension Governance

If no existing design-system component can represent a standalone UI element:

1. **Do NOT immediately create a page-specific component.**
2. First determine whether the UI represents a reusable design-system pattern:
   - **If reusable**:
     1. Identify the appropriate component category (Atom, Molecule, Organism).
     2. Extend an existing design-system component if appropriate.
     3. Add a variant or prop if that is the correct abstraction.
     4. Update existing usages if necessary.
     5. Then replace the standalone implementation.
   - **If genuinely unique**:
     - If the element is uniquely tied to this page's layout and unlikely to be reused elsewhere, keep it local.
     - Report these cases explicitly in the final migration report rather than silently creating new design-system components.

---

## Stage 6: Multi-Breakpoint Verification & Secondary Audit

After completing the migration, perform a rigorous second audit:

### 1. Per-Component Verification Checklist
For every replaced standalone component, verify:
- [ ] Correct design-system component is being used.
- [ ] Correct variant is being used.
- [ ] Correct props are being passed.
- [ ] Functionality, events, and validation are preserved.
- [ ] Accessibility is preserved (semantic HTML, ARIA, keyboard support).
- [ ] Responsive behavior is preserved.
- [ ] No duplicate component or orphaned wrapper remains.
- [ ] No unnecessary ad-hoc styling remains.
- [ ] No unnecessary hardcoded design values remain.

### 2. Multi-Breakpoint Verification
Verify the migrated components across all three viewports:
- **Desktop (`>= 1280px`)**: Multi-column layouts, hover states, sticky bars, desktop modals.
- **Tablet (`768px - 1024px`)**: Grid reflows, responsive navigation, touch/mouse parity.
- **Mobile (`375px - 480px`)**: Touch targets ($\ge 44 \times 44\text{px}$), bottom sheets/drawers, viewport margin bounds.

### 3. Codebase Search
Search the page directory and parent modules again for similar standalone implementations that may have been missed.

### 4. Automated Compiler & Test Gates
```bash
# 1. Typecheck for compiler errors and prop compatibility
npx tsc --noEmit

# 2. Execute existing unit and service tests
npm run test
```

---

## Final Migration Report Template

Every migration must conclude with a standardized summary report:

```markdown
# Design System Migration Report: [PAGE_NAME]

## 1. Replaced Components
| Standalone Component | Design-System Replacement | Variant / Props Applied |
| :--- | :--- | :--- |
| `StandaloneProductCard` | `ProductCard` | `variant="standard"` `size="md"` |
| `inline-quantity-picker` | `QuantitySelector` | `min={1}` `max={stock}` |

## 2. Extended Components
- `[ComponentName]`: Added prop `[propName]` to support `[specific behavior]` without breaking existing consumers.
*(Explicitly state "None" if no components were extended)*

## 3. New Design-System Components
- `[NewComponent]`: Genuinely reusable design-system component created. (Rationale: `[...]`)
*(Explicitly state "None" if no new components were created)*

## 4. Remaining Standalone Components
- `[LocalComponent]`: Retained locally because `[justification: unique to page layout / not reusable]`.
*(Explicitly state "None" if all components were replaced)*

## 5. Token Cleanup Inventory
- **Colors**: Replaced `[N]` raw hex colors with semantic tokens.
- **Typography**: Replaced `[N]` arbitrary font size/weight declarations.
- **Spacing & Geometry**: Replaced `[N]` arbitrary spacing/radius/shadow values with design tokens.

## 6. Verification
- [x] TypeScript type-check passed (`npx tsc --noEmit`)
- [x] Existing test suite passed (`npm run test`)
- [x] Existing functionality and business logic preserved
- [x] Responsive behavior verified (Desktop, Tablet, Mobile)
- [x] Accessibility attributes and keyboard interaction preserved
- [x] No unnecessary duplicate components or orphaned code remain
```

---

## Strict Constraints

1. **Do not redesign the page.**
2. **Do not change business logic, API endpoints, or database queries.**
3. **Do not remove or degrade existing functionality.**
4. **Do not duplicate existing components.**
5. **Do not create aliases simply to preserve old component names.**
6. **Do not detach existing component usage unnecessarily.**
7. **Do not recreate design-system styles locally.**
8. **Do not introduce arbitrary values when tokens exist.**
9. **Do not silently create new design-system components.**
10. **Do not modify unrelated code or perform broad out-of-scope refactors.**
11. **Do not use unnecessary TypeScript type assertions (`as any`).**
12. **Make the smallest clean change necessary.**
