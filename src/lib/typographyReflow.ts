/**
 * Typography-triggered reflow
 * ---------------------------
 * Wraps `patchScoped` for the fields that change the rendered text width
 * (fontPx, leading, tracking, hScale). After patching, schedules a
 * `reflowLayerText` pass for every affected (pageId, rowIndex, layer) so
 * Area-Text style overflow cascades through the linked scope.
 *
 * Kept in src/lib/ to avoid creating an `overridesStore → textReflow → overridesStore`
 * import cycle.
 */
import {
  patchScoped,
  getScopedLayerKeys,
  useOverridesStore,
  MASTER_DEFAULTS,
  type LocalOverride,
} from "@/state/overridesStore";

import type { SelectionScope } from "@/state/editorStore";
import { reflowLayerText } from "./textReflow";
import type { ReflowLayer } from "./reflowScope";

const TYPO_FIELDS = new Set<keyof LocalOverride>([
  "fontPx",
  "leading",
  "tracking",
  "hScale",
]);

export type TypographyReflowContext = {
  /** Font family for the layer being patched. */
  arabicFontFamily: string;
  banglaFontFamily: string;
  /** Available pixel width for one row (page width minus side padding). */
  availableWidth: number;
};

function parseLayerKey(key: string): { pageId: string; rowIndex: number; layer: ReflowLayer } | null {
  const parts = key.split(":");
  if (parts[0] !== "layer" || parts.length < 4) return null;
  const layer = parts[3] as string;
  if (layer !== "arabic" && layer !== "bangla") return null;
  return { pageId: parts[1]!, rowIndex: Number(parts[2]), layer };
}

/**
 * Patch a typography field across the chosen scope, then reflow every
 * affected (page, row, layer) so the visible text re-flows into the
 * available width.
 *
 * Falls back to plain `patchScoped` for non-typography fields.
 */
export async function patchTypographyScoped(
  representativeKey: string,
  patch: Partial<Record<keyof LocalOverride, LocalOverride[keyof LocalOverride] | undefined>>,
  scope: SelectionScope,
  ctx: TypographyReflowContext,
): Promise<void> {
  await patchScoped(representativeKey, patch, scope);

  const fields = Object.keys(patch) as Array<keyof LocalOverride>;
  const isTypo = fields.some((f) => TYPO_FIELDS.has(f));
  if (!isTypo) return;

  // Read fanned-out keys synchronously after the patch lands.
  const keys = await getScopedLayerKeys(representativeKey, scope);

  // Use the patched fontPx if present; otherwise let reflow read it later.
  const newFontPx = typeof patch.fontPx === "number" ? patch.fontPx : undefined;

  // Schedule reflow for each affected layer-row in a microtask so the
  // override store mutation is fully committed first.
  queueMicrotask(() => {
    for (const k of keys) {
      const parsed = parseLayerKey(k);
      if (!parsed) continue;
      const family = parsed.layer === "arabic" ? ctx.arabicFontFamily : ctx.banglaFontFamily;
      const fontSize = newFontPx ?? readFontPxFromStore(k, parsed.layer);
      try {
        reflowLayerText({
          pageId: parsed.pageId,
          rowIndex: parsed.rowIndex,
          layer: parsed.layer,
          reason: "typography",
          fontFamily: family,
          fontSize,
          availableWidth: ctx.availableWidth,
          scope,
        });
      } catch (err) {
        // Swallow individual row failures; one bad row shouldn't break the loop.
        // eslint-disable-next-line no-console
        console.warn("[patchTypographyScoped] reflow failed for", k, err);
      }
    }
  });
}

function readFontPxFromStore(layerK: string, layer: ReflowLayer): number {
  const s = useOverridesStore.getState();
  const ov = s.local[layerK];
  if (typeof ov?.fontPx === "number") return ov.fontPx;
  if (layer === "arabic") return s.global.arabicFontPx ?? MASTER_DEFAULTS.arabicFontPx ?? 40;
  return s.global.banglaFontPx ?? MASTER_DEFAULTS.banglaFontPx ?? 18;
}

