import { z } from "zod";

export const BrandSchema = z.object({
  name: z.string(),
  logo: z.string().or(z.null()),
  backgroundColor: z.string(),
});
export type Brand = z.infer<typeof BrandSchema>;

export const LabelSchema = z.object({
  brand: BrandSchema,
  type: z.string(),
  name: z.string(),
});
export type Label = z.infer<typeof LabelSchema>;

export const AppStateSchema = z.object({
  brands: z.array(BrandSchema),
  labels: z.array(LabelSchema),
  labelConfig: z.object({
    width: z.number(),
    height: z.number(),
    cornerRadius: z.number(),
    logoSize: z.number(),
    brandFontSize: z.number(),
    filamentFontSize: z.number(),
  }),
  filamentTypes: z.array(z.string()),
});
export type AppStateType = z.infer<typeof AppStateSchema>;

export type FilamentType = string;
