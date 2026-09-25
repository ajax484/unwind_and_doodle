# ComboBox Component Implementation

## What Changed
- Implemented the canonical single-select searchable dropdown [ComboBox.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/ComboBox.tsx) atom adhering to WAI-ARIA combobox guidelines and Unwind & Doodle tokenized styling.
- Exported `ComboBox` and its associated types (`ComboBoxProps`, `ComboBoxOption`, `ComboBoxRef`) in [FormControls.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/FormControls.tsx).
- Created a comprehensive Storybook suite in [ComboBox.stories.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/ComboBox.stories.tsx) covering default, rich metadata, grouping, custom creatable values, loading states, sizing matrix (`sm`, `md`, `lg`), error/disabled states, and interactive selection play tests.

## Why
- Provide a robust, accessible, searchable selection control across storefront filters and admin backoffice workflows where standard native `<select>` dropdowns are insufficient.

## Files Touched
- `src/components/ComboBox.tsx`
- `src/components/FormControls.tsx`
- `src/components/ComboBox.stories.tsx`

## Follow-ups / Known Issues
None

## Commit Message
`feat(design-system): implement canonical ComboBox atom and Storybook stories`
