# Design System Component Reconciliation Workflow

Standardized procedure and template for reconciling React component implementations with canonical Figma design system specifications and Storybook interactive representations.

> [!NOTE]
> This workflow is also registered as an active Antigravity Workspace Skill at [`.agents/skills/component-reconciliation/SKILL.md`](file:///c:/Users/USER/work/unwind_and_doodle/.agents/skills/component-reconciliation/SKILL.md).

---

## Component Metadata Template

```markdown
## Component

**Component name:** `[COMPONENT_NAME]`
**Figma documentation page/frame:** `[DOCUMENTATION_NAME]`
**React implementation:** `[FILE_PATH_OR_COMPONENT_NAME]`
**Component category:** `[ATOM / MOLECULE / ORGANISM / PATTERN]`
```

---

## Objective & Philosophy

Reconcile the **actual React implementation** of `[COMPONENT_NAME]` with the **canonical Figma design-system specification** and **Storybook interactive documentation** (if Storybook is in use).

The goal is to make the implementation, Figma architecture, and Storybook agree while preserving existing application behavior and API compatibility.

### Tri-Directional Source of Truth Alignment

```text
Figma (Canonical Visual & Design Spec)
   │
   ▼
Canonical Component Specification
   │
   ▼
React Implementation (Canonical Behavior & API Spec)
   │
   ▼
Storybook (Interactive Implementation Reference & Controls)
```

- **Figma** is the canonical **design specification**.
- **Existing React implementation** is the canonical **behavior/API specification**, unless a change is required to achieve design-system alignment.
- **Storybook** is the interactive implementation and documentation reference. Do not introduce Storybook if the project does not currently use it unless explicitly instructed.
- Do not redesign the component.
- Do not make unrelated improvements.

---

## 6-Stage Core Workflow

```text
1. Inspect (Codebase, Figma Scenegraph, Storybook MCP / Configuration)
2. Compare (Figma ↔ React ↔ Storybook Matrix)
3. Identify Discrepancies (Visual, Structural, Token, API, Accessibility)
4. Reconcile (Tokens, Component Code, Composition, Stories)
5. Validate (Type-checking, Tests, Storybook Builds & Live Previews)
6. Report (Standardized 12-Section Reconciliation Report with Live Preview URL)
```

---

## 1. Inspect the Existing Implementation

Before modifying anything, inspect the actual codebase.

### Locate:
* `[COMPONENT_NAME]`
* Related utilities and helpers
* Styling/CVA definitions
* Supporting sub-components
* Icon handling
* State handling
* Responsive behavior
* Accessibility behavior
* Existing tests (if they exist)

### Search All Usages:
Search for all meaningful usages of `[COMPONENT_NAME]` across storefront and admin workspaces.

### Determine:
* Current public API and props
* Variants, sizes, states
* Composition model
* Responsive & mobile behavior
* Interaction and keyboard behavior
* Accessibility semantics (ARIA, focus management)
* Token usage vs. hardcoded hex/arbitrary values
* Duplicated or inline implementations
* Related utility classes

*Do not assume the implementation matches previous audits. Inspect the current code.*

---

## 2. Inspect the Canonical Figma Component

Inspect the actual Figma component and its documentation frame using available tooling (e.g., Figma Bridge MCP).

### Verify:
* Component set and variant count
* Component properties (Variants, Booleans, Text, Instance Swap)
* Default property configuration
* States (`Default`, `Hover`, `Pressed`, `Disabled`, `Loading`, `Empty`, `Error`)
* Sizes (`SM`, `MD`, `LG`, etc.)
* Nested components and instance references
* Auto Layout configuration, spacing, and padding
* Typography styles
* Color styles and variable bindings
* Borders, dividers, stroke weights
* Corner radii
* Elevation and drop shadows
* Icon handling and positions
* Interaction states & motion timings
* Responsive examples & constraints
* Accessibility guidance and touch target rules
* Documentation board layout and specimen instances

*Do not rely on a previous report if the live Figma scenegraph can be inspected. The live Figma design is the visual source of truth.*

---

## 3. Inspect Existing Storybook Environment

Determine:
* Whether Storybook is installed in `package.json`
* Storybook version and configuration (`.storybook/`)
* Existing story location and directory structure
* Story naming conventions (`*.stories.tsx`)
* Existing decorators and providers (theme, context, mock stores)
* Existing Controls configuration
* Existing documentation / MDX pages
* Existing interaction tests (`play` functions, `@storybook/test`)
* Existing visual regression or accessibility testing configuration (e.g. `@storybook/addon-a11y`)

### Storybook MCP Discovery (When Connected):
If the Storybook MCP server is active (`http://localhost:6006/mcp`):
* **`docs-list`** (with `withStoryIds: true`): Discover registered component IDs, existing story IDs, and documentation entries across the catalog.
* **`docs-show`** (`id="<component-id>"`): Inspect live TypeScript prop definitions, real story code snippets, and usage patterns to avoid guessing APIs.
* **`docs-show-story`** (`storyId="<story-id>"`): Inspect specific story variant code and arguments for nuanced implementation examples.

> [!IMPORTANT]
> **Strict Storybook Rule**: Do not introduce Storybook if the project does not currently use it unless explicitly instructed. If Storybook already exists, strictly adhere to the project's established conventions.

---

## 4. Canonical Component Specification

Document the component's canonical design specification:

```text
Component Set:
[COMPONENT_NAME]

Properties:
- [Property 1]: [Values]
- [Property 2]: [Values]
- ...

Default:
[Default Configuration String]

Structure:
[Component Anatomy Tree]

Sizes:
- SM: [dimensions / padding]
- MD: [dimensions / padding]
- LG: [dimensions / padding]

Styling:
- Surface / Background
- Border / Stroke
- Corner Radius
- Elevation / Shadow
- Typography (Header, Body, Caption)
- Icons
- Actions / Sub-components
```

---

## 5. Figma ↔ React ↔ Storybook Comparison

Compare the actual React implementation and Storybook stories against the canonical Figma specification.

### Reconciliation Table

| Property | Figma Specification | Current React | Storybook Status | Reconciliation Status |
| :--- | :--- | :--- | :--- | :--- |
| Structure | | | | |
| Variants | | | | |
| States | | | | |
| Sizes | | | | |
| Props | | | | |
| Typography | | | | |
| Colors | | | | |
| Spacing | | | | |
| Radius | | | | |
| Borders | | | | |
| Elevation | | | | |
| Icons | | | | |
| Motion | | | | |
| Responsive behavior | | | | |
| Accessibility | | | | |

### Permitted Status Values:
* `MATCH`
* `VALUE MISMATCH`
* `STRUCTURE MISMATCH`
* `NAMING MISMATCH`
* `FIGMA ONLY`
* `CODE ONLY`
* `HARDCODED USAGE`
* `BEHAVIOR MISMATCH`
* `ACCESSIBILITY MISMATCH`
* `RESPONSIVE MISMATCH`

---

## 6. Token Reconciliation

Verify that the component consumes established design-system tokens rather than hardcoded arbitrary values.

### Inspect:
* Primitive color tokens
* Semantic color tokens (`bg-*`, `text-*`, `border-*`, `action-*`, `status-*`)
* Typography tokens (`font-heading`, `font-body`, scale)
* Spacing tokens (`spacing-*`, padding, margins, gaps)
* Sizing tokens (fixed widths, min/max heights)
* Radius tokens (`radius-sm`, `radius-md`, `radius-lg`, `radius-pill`)
* Border tokens (stroke widths, border colors)
* Elevation tokens (box shadows, overlays)
* Iconography tokens (sizes, stroke weights)
* Motion tokens (durations, easing)

### Action Matrix for Every Non-Canonical Value:
* `KEEP AS ONE-OFF` (only for verified one-off graphics or third-party brand assets)
* `USE EXISTING TOKEN`
* `CONSOLIDATE INTO EXISTING TOKEN`
* `INVESTIGATE`

*Rules:*
- Do not create a new token unless the canonical Figma design explicitly contains a token missing from code.
- Do not create component-specific tokens simply because a value occurs inside this component.
- Prefer existing semantic tokens over primitive values.

---

## 7. API Reconciliation & Compatibility

Inspect every existing public prop. Determine whether the React API can represent the Figma component.

### Guidelines:
* Preserve existing API compatibility wherever possible.
* Do not rename or remove props simply to make them match Figma property names; map them conceptually (e.g., `variant="primary"` ↔ `Variant=Primary`).
* Preserve existing support for:
  * `children`
  * `className`
  * `ref` forwarding
  * Event handlers (`onClick`, `onChange`, `onKeyDown`, etc.)
  * Disabled state
  * Native HTML attributes
  * Polymorphic rendering (if applicable)
  * Loading / pending states
* Only make breaking changes if absolutely necessary.
* If a breaking change appears necessary, **do not implement it automatically**. Report it as a blocking decision.

---

## 8. Composition & Reuse Hierarchy

Check whether the component should reuse existing design-system components. Follow strict Atomic Design composition:

```text
Button        → existing Button
Badge         → existing Badge
Spinner       → existing Spinner
Skeleton      → existing Skeleton
FormControls  → existing Input / Textarea / Checkbox
Modal         → existing Modal
EmptyState    → existing EmptyState
Pagination    → existing Pagination
RatingStars   → existing RatingStars
Avatar        → existing Avatar
```

*Rules:*
- If an established sub-element exists in the design system, reuse it.
- Never duplicate sub-elements (e.g. do not create `PrimaryButton`, `ModalCloseButton`, `CustomSpinner`, or `ComponentSpecificBadge`) unless canonical architecture explicitly requires them.
- If an atomic dependency does not exist in code yet, flag whether to reconcile the atom first or use design-token utility classes until the atom is available.

---

## 9. Accessibility (WCAG 2.1 AA)

Verify component-specific accessibility requirements:
* **Keyboard Interaction**: Full navigation (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys).
* **Focus Management**: Visible focus rings (`focus:ring-2 focus:ring-offset-2`), focus trapping in overlays, and focus restoration on unmount.
* **Semantic HTML**: Use native elements (`<button>`, `<dialog>`, `<nav>`, `<header>`, `<ul>`) before ARIA.
* **Accessible Names & Labels**: Ensure all interactive elements have accessible names via visible text, `aria-label`, or `aria-labelledby`.
* **ARIA Attributes**: `role="dialog"`, `aria-modal="true"`, `aria-expanded`, `aria-controls`, `aria-describedby` where appropriate. Do not add redundant ARIA.
* **Disabled Behavior**: Set `disabled` and `aria-disabled="true"`.
* **Touch Targets**: Minimum 40–44px clickable target size for mobile.
* **Screen Reader Behavior**: Clear announcements for state changes and error alerts.
* **Color Contrast**: Compliant with WCAG 2.1 AA standards; never communicate state solely through color.

---

## 10. Responsive Behavior

Verify behavior across standard viewports:
* **Desktop** ($\ge 1024\text{px}$)
* **Tablet** ($768\text{px} - 1023\text{px}$)
* **Mobile** ($< 768\text{px}$)

### Inspect:
* Layout flow, flex directions, and grid column wrapping
* Modal/drawer sizing (`max-w-[calc(100vw-2rem)]`, max-heights, scroll containment)
* Horizontal overflow prevention
* Touch target sizing on touchscreens
* Visibility toggles and compact variants
* Never create a separate mobile component unless the canonical architecture explicitly requires it.

---

## 11. Storybook Reconciliation (When Active)

When Storybook is installed in the project:

### 1. Canonical Default Story:
Provide a default story representing the Figma canonical default state.

### 2. Interactive Controls:
Expose all meaningful Figma variant properties (`Variant`, `Size`, `State`, booleans) as interactive Storybook controls mapped to React props.

### 3. Variant Coverage:
Ensure stories or interactive controls cover:
* Key sizes (`SM`, `MD`, `LG`)
* Visual variants
* Interactive states (`Default`, `Hover`, `Pressed`, `Disabled`, `Loading`)
* Content variations (short copy, long text overflow, optional slots)

### 4. Interactive & Accessibility Testing:
* If `@storybook/addon-a11y` is present, verify zero accessibility violations.
* If interaction tests exist (`play` function), verify open/close, focus, and state changes.

### 5. Storybook MCP Assistance:
* Use **`get-storybook-story-instructions`** to reference CSF3 guidelines, accessibility rules, and story authoring best practices.
* Use **`stories-find-by-component`** to verify that the modified component source is properly mapped to its story file.
* Use **`stories-changed`** to verify detected story changes.

### 7. Standardized 10-Story Structure:
Every component suite should follow the standardized 10-story matrix (scaffolded via `npm run scaffold:story <ComponentName> [Category]`):
1. `Default` (Canonical baseline state)
2. `Empty` / `ZeroState` / `Secondary` (Baseline alternate)
3. `AlternativeMode` / `Compact` / `LayoutVariant`
4. `WithOptionalElements` (Boolean property toggles)
5. `Loading` (Operational Spinner or Skeleton)
6. `Success` / `Active` / `Selection`
7. `ErrorState` / `Disabled` / `Recovery`
8. `AuthenticScenario` (Domain-authentic storefront data)
9. `InteractivePlay` / `InteractiveFlow` (Automated play test)
10. `CssCheck` (Automated computed token verification against `#FFFFFF`, `#EDF3F7`, font families)

### 8. Storybook Interaction Testing Best Practices:
* **Autofocus & Mount Timer Settlement**:
  Modal dialogs, drawers, and popovers often mount with a brief autofocus delay (e.g. 50ms focus trap). Always settle autofocus and explicitly click input targets before typing in play functions to prevent keystrokes (such as spacebars) from triggering unexpected clicks on focused buttons:
  ```tsx
  // Settle mount autofocus before typing
  await new Promise((r) => setTimeout(r, 100));
  await userEvent.click(inputElement);
  await userEvent.type(inputElement, 'Value with spaces');
  ```
* **Mock Spy Isolation**:
  Because Storybook test runners share `meta.args` spy references (`fn()`) across stories in a file, always clear call counts at the start of any play test that asserts `toHaveBeenCalledTimes`:
  ```tsx
  (args.onAction as any)?.mockClear?.();
  ```

---

## 12. Implementation Guidelines

Modify only the files necessary to reconcile `[COMPONENT_NAME]`.

### Rules:
* Preserve business logic.
* Preserve existing API wherever possible.
* Preserve existing application behavior.
* Use established design tokens from `globals.css` / Tailwind `@theme`.
* **JSDoc Documentation Standard**: All exported component interfaces and public prop definitions must be thoroughly documented with JSDoc comments (`/** ... */`). These comments directly populate code editor intellisense, Storybook autodocs description tables, and MCP tool inspections (`docs-show`).
* **Standard Variant Pattern (CVA)**: Use `class-variance-authority` (`cva()`) for components with visual variants, sizes, or compound states.
  - Export `[componentName]Variants = cva(...)` for external composition and styling.
  - Derive prop types via `VariantProps<typeof [componentName]Variants>`.
  - Use `cn()` from `@/lib/utils` (combining `clsx` and `tailwind-merge`) for conflict-free class merging.
* Reuse existing design system components.
* Avoid unnecessary abstractions or wrapper layers.
* Avoid unrelated refactoring outside the task scope.
* Avoid new dependencies, new icon libraries, or new styling frameworks.
* Avoid unnecessary TypeScript type assertions (`as any`, `as Record<string, unknown>`). Use proper typing and inference.

---

## 13. Validation Protocol

Execute the following checks after implementation:

1. **Usage Scan**: Search all usages across the repository to confirm imports and props remain unbroken.
2. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with 0 errors.
3. **Automated Tests (2-Tier Verification Loop)**:
   * **Tier 1 — Fast Development Loop (Component-Level)**:
     Run only the active component's story suite for rapid (~2s) feedback during implementation and debugging:
     ```bash
     npm run test:story -- <ComponentName>.stories.tsx
     ```
   * **Tier 2 — Full Regression Milestone Gate (Pre-Commit / Pre-Handoff)**:
     Run the complete project-wide Storybook test suite across all component files:
     ```bash
     npx vitest --project storybook run
     ```
   * **Existing Unit / Integration Tests**:
     ```bash
     npm test
     ```
     Run existing test suites. If a pre-existing test fails, report it transparently — do not modify tests to make them pass silently.
4. **Storybook Compilation & Live Verification** (if installed):
   * **Mandatory Live Preview Verification (`stories-preview`)**:
     Call the `stories-preview` MCP tool for the component's stories to generate and verify live interactive preview URLs (e.g., `http://localhost:6006/?path=/story/[story-id]`). Include this preview link in the final reconciliation report.
   * Run a static Storybook build as the final milestone asset bundling check:
     ```bash
     npm run build-storybook
     ```
5. **No Production Build**: Do not run a production Next.js build (`next build`) unless explicitly instructed.
6. **No Figma Canvas Modifications**: Do not modify Figma component sets during code reconciliation unless explicitly instructed.

---

## 14. Documentation Reconciliation

Inspect the existing Figma documentation frame for `[COMPONENT_NAME]`:
* Check component name, anatomy table, variant matrices, sizes, realistic examples, and rules.
* If documentation is inaccurate because the implementation was reconciled, update the **existing documentation frame only where necessary**.
* Maintain the established documentation structure:
  * Overview
  * Anatomy
  * Variants
  * States
  * Sizes
  * Usage Examples
  * Responsive Behavior
  * Accessibility
  * Related Components
* Do not create a second documentation page or duplicate documentation boards.
* Update `docs/design-system/CHANGELOG.md` for design system adjustments.

---

## 15. Standardized Final Report Format

Every reconciliation task must terminate with this exact report format:

```markdown
# Step 7C.2 — [COMPONENT_NAME] Reconciliation Report

## 1. Overall Status
[PASS | PASS WITH MINOR ISSUES | PARTIAL | FAIL]

## 2. Existing Implementation Audit
- Implementation location:
- Public API:
- Variants:
- States:
- Sizes:
- Composition:
- Responsive behavior:
- Accessibility:
- Current token usage:

## 3. Figma ↔ React ↔ Storybook Reconciliation
| Property | Figma | React | Storybook | Status |
| :--- | :--- | :--- | :--- | :--- |
| Structure | | | | |
| Variants | | | | |
| States | | | | |
| Sizes | | | | |
| Props | | | | |
| Typography | | | | |
| Colors | | | | |
| Spacing | | | | |
| Radius | | | | |
| Borders | | | | |
| Elevation | | | | |
| Icons | | | | |
| Motion | | | | |
| Responsive | | | | |
| Accessibility | | | | |

## 4. Token Reconciliation
| Category | Existing Usage | Required Usage | Action |
| :--- | :--- | :--- | :--- |
| Color | | | |
| Typography | | | |
| Spacing | | | |
| Radius | | | |
| Border | | | |
| Elevation | | | |
| Iconography | | | |
| Motion | | | |

## 5. Changes Made
- [List every modified file and summary of edits]

## 6. API Compatibility
- Props changed:
- Variant API changed:
- Size API changed:
- State API changed:
- Ref behavior changed:
- Composition changed:
- Breaking changes:

## 7. Storybook
- Storybook installed: [Yes / No]
- Story location:
- Live Storybook Preview URL: [URL generated via stories-preview]
- Canonical story:
- Controls mapping:
- Accessibility / Interaction tests:

## 8. Accessibility
- Final accessibility state report (semantics, keyboard, focus, ARIA, touch targets)

## 9. Responsive Behavior
- Final responsive behavior report (desktop, tablet, mobile)

## 10. Documentation
- Documentation inspected:
- Documentation updated:
- Documentation matches final implementation:

## 11. Validation
- `npx tsc --noEmit` result:
- Existing tests result:
- Storybook compilation result:

## 12. Remaining Issues
### Critical
- [None or describe]
### Major
- [None or describe]
### Minor
- [None or describe]

## 13. Final Verdict
1. Does React now match the canonical Figma component?
2. Is the existing API preserved?
3. Are existing usages compatible?
4. Is the component using the design-token system correctly?
5. Is the Figma documentation accurate?
6. Is the component ready for the next reconciliation pass?
```

---

## Strict Constraints

1. **Figma is the canonical design specification.**
2. **Existing React behavior/API is preserved wherever possible.**
3. **Inspect actual Figma scenegraph and actual code before modifying anything.**
4. **Do not trust previous audit reports blindly.**
5. **Do not redesign the component.**
6. **Do not create duplicate components.**
7. **Do not create unnecessary new tokens.**
8. **Do not create component-specific tokens when an existing semantic token is appropriate.**
9. **Do not introduce Storybook if not already in the project.**
10. **Do not introduce unrelated refactors or touch out-of-scope files.**
11. **Do not change business logic.**
12. **Do not introduce new dependencies, styling libraries, or icon sets.**
13. **Do not modify tests to make them pass silently.**
14. **Do not run a production build unless explicitly instructed.**
15. **Do not use unnecessary TypeScript type assertions (`as any`).**
16. **Preserve existing API compatibility.**
17. **Modify only what is necessary for this component.**
18. **Update existing documentation only when necessary.**
19. **Stop after component reconciliation and validation.**
