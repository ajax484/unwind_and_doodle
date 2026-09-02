import { z } from 'zod';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const CreateThemeSchema = z.object({
  name: z.string().trim().min(1, 'Theme name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .trim()
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .nullable(),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').optional().nullable(),
  storagePath: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type CreateThemeInput = z.infer<typeof CreateThemeSchema>;

export const UpdateThemeSchema = CreateThemeSchema.partial();

export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>;

export const ReorderThemesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
  })
);

export type ReorderThemesInput = z.infer<typeof ReorderThemesSchema>;

export const AssignProductThemesSchema = z.object({
  themeIds: z.array(z.string().uuid()),
});

export type AssignProductThemesInput = z.infer<typeof AssignProductThemesSchema>;

export const ThemeCustomizationInputSchema = z.object({
  selectedThemeIds: z
    .array(z.string().uuid('Invalid theme ID format'))
    .min(1, 'At least 1 theme must be selected')
    .max(3, 'At most 3 themes can be selected')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate theme selections are not allowed',
    }),
  coverName: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val === '' || val.length <= 100, {
      message: 'Cover name must be 100 characters or less',
    })
    .optional(),
});

export type ThemeCustomizationInput = z.infer<typeof ThemeCustomizationInputSchema>;

// ==========================================
// TYPESCRIPT RESPONSE MODELS
// ==========================================

export interface Theme {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  storagePath: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTheme {
  id: string;
  name: string;
  description: string | null;
  storagePath: string | null;
  sortOrder: number;
}

export interface ThemeSnapshot {
  themeId: string | null;
  themeName: string;
  sortOrder: number;
}

export interface OrderItemThemeCustomizationDetail {
  id: string;
  orderItemId: string;
  coverName: string | null;
  createdAt: string;
  themes: ThemeSnapshot[];
}
