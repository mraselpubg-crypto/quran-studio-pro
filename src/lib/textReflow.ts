/**
 * Text Reflow Engine
 * ------------------
 * Handles dynamic text reflow across rows and pages in editor mode.
 * When text is added/modified in a row, overflow cascades to subsequent rows
 * and across page boundaries.
 *
 * PERFORMANCE NOTE: All text measurement uses Canvas API (canvasMeasure.ts)
 * instead of DOM-span offsetWidth to avoid Layout Thrashing.
 */

import type { FabricLine } from "@/components/studio/FabricLines";
import type { LocalOverride } from "@/state/overridesStore";
import { measureTextWidthCanvas, splitToFitCanvas } from "./canvasMeasure";

export type LayerKind = "arabic" | "bangla";

/**
 * Measures the rendered pixel width of `text`.
 * Uses Canvas API — no DOM reads, no Layout Thrashing.
 *
 * @deprecated Use measureTextWidthCanvas() from canvasMeasure.ts directly.
 * This wrapper is kept for backwards-compatibility with any callers.
 */
export function measureTextWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
): number {
  return measureTextWidthCanvas(text, fontFamily, fontSize);
}

/**
 * Splits text to fit within maxWidth pixels using Canvas measurement.
 * Replaces the previous DOM-span based implementation.
 */
export function splitToFit(
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
): { fits: string; overflow: string } {
  return splitToFitCanvas(text, maxWidth, fontFamily, fontSize);
}

/**
 * Gets effective text for a row+layer — uses local override text if set,
 * otherwise falls back to original page data.
 */
export function getEffectiveText(
  pageId: string,
  rowIndex: number,
  layer: LayerKind,
  lines: FabricLine[],
  localMap: Record<string, LocalOverride>,
  layerKeyFn: (pageId: string, rowIndex: number, layer: LayerKind) => string,
): string {
  const lk = layerKeyFn(pageId, rowIndex, layer);
  const ov = localMap[lk];
  if (ov?.text !== undefined) return ov.text;
  return layer === "arabic"
    ? (lines[rowIndex]?.arabic ?? "")
    : (lines[rowIndex]?.bangla ?? "");
}

export type ReflowOptions = {
  startPageId: string;
  startRowIndex: number;
  startOverflow: string;
  layer: LayerKind;
  /** All pages in order — {id, lines}[] */
  allPages: Array<{ id: string; lines: FabricLine[] }>;
  localMap: Record<string, LocalOverride>;
  patchLocal: (key: string, ov: Partial<LocalOverride>) => void;
  layerKeyFn: (pageId: string, rowIndex: number, layer: LayerKind) => string;
  fontFamily: string;
  fontSize: number;
  availableWidth: number;
  /** If provided, reflow is constrained to these pageIds (e.g. one surah). */
  surahPageIds?: string[];
};


/**
 * Cascading reflow from a given row across the entire surah.
 * Accepts an overflow string and distributes it through subsequent rows/pages.
 * Uses Canvas measurement — no DOM reads.
 */
export function reflowFrom(opts: ReflowOptions): void {
  const {
    startPageId,
    startRowIndex,
    startOverflow,
    layer,
    allPages,
    localMap,
    patchLocal,
    layerKeyFn,
    fontFamily,
    fontSize,
    availableWidth,
    surahPageIds,
  } = opts;

  let overflow = startOverflow.trim();
  const targetPages = surahPageIds
    ? allPages.filter((p) => surahPageIds.includes(p.id))
    : allPages;
  const startPageIdx = targetPages.findIndex((p) => p.id === startPageId);
  if (startPageIdx === -1) return;

  // Iterate through pages starting from the given position
  for (let pi = startPageIdx; pi < targetPages.length && overflow !== ""; pi++) {
    const page = targetPages[pi];
    const firstRow = pi === startPageIdx ? startRowIndex : 0;

    for (let ri = firstRow; ri < page.lines.length; ri++) {
      const lk = layerKeyFn(page.id, ri, layer);
      // Get existing text for this row (only for rows after the start)
      const existingText =
        pi === startPageIdx && ri === startRowIndex
          ? "" // start row already has its new text set
          : getEffectiveText(page.id, ri, layer, page.lines, localMap, layerKeyFn);

      // Combine overflow with existing text
      const combined = existingText
        ? overflow + " " + existingText
        : overflow;

      const { fits, overflow: newOverflow } = splitToFitCanvas(
        combined,
        availableWidth,
        fontFamily,
        fontSize,
      );

      patchLocal(lk, { text: fits });
      overflow = newOverflow.trim();

      if (overflow === "") break;
    }
  }
}


export type BackFillOptions = {
  startPageId: string;
  startRowIndex: number;
  layer: LayerKind;
  allPages: Array<{ id: string; lines: FabricLine[] }>;
  localMap: Record<string, LocalOverride>;
  patchLocal: (key: string, ov: Partial<LocalOverride>) => void;
  layerKeyFn: (pid: string, ri: number, layer: LayerKind) => string;
  fontFamily: string;
  fontSize: number;
  availableWidth: number;
  surahPageIds?: string[];
};

/**
 * Back-fill cascade: when a row has spare width, pull leading words from the
 * next row(s) to fill it. Continues forward until no more words can be pulled
 * or the end of the target page range is reached.
 *
 * Uses Canvas measurement only (no DOM reads). Mirrors `reflowFrom` style.
 */
export function backFillFrom(opts: BackFillOptions): void {
  const {
    startPageId,
    startRowIndex,
    layer,
    allPages,
    localMap,
    patchLocal,
    layerKeyFn,
    fontFamily,
    fontSize,
    availableWidth,
    surahPageIds,
  } = opts;

  const targetPages = surahPageIds
    ? allPages.filter((p) => surahPageIds.includes(p.id))
    : allPages;
  const startPageIdx = targetPages.findIndex((p) => p.id === startPageId);
  if (startPageIdx === -1) return;

  // In-memory text cache so iterative writes are visible without re-reading store.
  const textCache = new Map<string, string>();
  const readText = (pid: string, ri: number, lines: FabricLine[]): string => {
    const lk = layerKeyFn(pid, ri, layer);
    if (textCache.has(lk)) return textCache.get(lk)!;
    return getEffectiveText(pid, ri, layer, lines, localMap, layerKeyFn);
  };
  const writeText = (pid: string, ri: number, text: string) => {
    const lk = layerKeyFn(pid, ri, layer);
    textCache.set(lk, text);
    patchLocal(lk, { text });
  };

  let pi = startPageIdx;
  let ri = startRowIndex;

  const maxIterations = targetPages.length * 50 + 100;
  let iter = 0;

  while (iter++ < maxIterations) {
    const curPage = targetPages[pi];
    if (!curPage || ri >= curPage.lines.length) break;

    // Find next row (same page, else next page row 0).
    let nPi = pi;
    let nRi = ri + 1;
    if (nRi >= curPage.lines.length) {
      nPi = pi + 1;
      nRi = 0;
    }
    if (nPi >= targetPages.length) break;
    const nextPage = targetPages[nPi];
    if (!nextPage || nextPage.lines.length === 0) break;

    const curText = readText(curPage.id, ri, curPage.lines).trim();
    const nextText = readText(nextPage.id, nRi, nextPage.lines).trim();

    if (nextText === "") {
      // Empty next row — nothing to pull; advance to it and continue collapsing.
      pi = nPi;
      ri = nRi;
      continue;
    }

    const combined = curText ? curText + " " + nextText : nextText;
    const { fits, overflow } = splitToFitCanvas(
      combined,
      availableWidth,
      fontFamily,
      fontSize,
    );

    // No extra word pulled — leading word of nextText doesn't fit. Stop.
    if (fits === curText) break;

    writeText(curPage.id, ri, fits);
    writeText(nextPage.id, nRi, overflow.trim());

    if (overflow.trim() === "") {
      // Next row fully drained — advance and try to pull from the row after.
      pi = nPi;
      ri = nRi;
      continue;
    }
    // Next row still has text but couldn't give more — done.
    break;
  }
}


/**
 * Gets text before and after the cursor in a contenteditable element.
 */
export function getTextAroundCursor(el: HTMLElement): {
  before: string;
  after: string;
} {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return { before: el.textContent ?? "", after: "" };
  }

  const range = sel.getRangeAt(0);

  // Range from start of element to cursor
  const beforeRange = document.createRange();
  try {
    beforeRange.setStart(el, 0);
    beforeRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    return { before: el.textContent ?? "", after: "" };
  }

  const before = beforeRange.toString();
  const full = el.textContent ?? "";
  const after = full.substring(before.length);

  return { before, after };
}


/* ─── planCascade — pure dry-run for cross-page reflow ──────────── */

export type CascadeRowUpdate = {
  pageId: string;
  rowIndex: number;
  layer: LayerKind;
  text: string;
};

export type CascadePlan = {
  rowUpdates: CascadeRowUpdate[];
  crossesPage: boolean;
  crossesSurah: boolean;
  affectedPages: number;
  /** Text that does not fit anywhere in the scoped pages (overflow tail). */
  tailOverflow: string;
};

export type PlanCascadeOptions = {
  startPageId: string;
  startRowIndex: number;
  /** What the start row should contain AFTER the edit. */
  newCurrentText: string;
  /** Text to flow into the row after `start`. May be empty. */
  pushedText: string;
  layer: LayerKind;
  /** All scoped pages in order. */
  allPages: Array<{ id: string; lines: FabricLine[] }>;
  localMap: Record<string, LocalOverride>;
  layerKeyFn: (pid: string, ri: number, layer: LayerKind) => string;
  fontFamily: string;
  fontSize: number;
  availableWidth: number;
  /** PageIds belonging to the current surah (for crossesSurah detection). */
  surahPageIds?: string[];
};

/**
 * Pure dry-run: returns the diff of what reflow WOULD do, without mutating
 * any store. Lets the caller decide whether to confirm via a dialog.
 */
export function planCascade(opts: PlanCascadeOptions): CascadePlan {
  const {
    startPageId,
    startRowIndex,
    newCurrentText,
    pushedText,
    layer,
    allPages,
    localMap,
    layerKeyFn,
    fontFamily,
    fontSize,
    availableWidth,
    surahPageIds,
  } = opts;

  const startPageIdx = allPages.findIndex((p) => p.id === startPageId);
  if (startPageIdx === -1) {
    return {
      rowUpdates: [],
      crossesPage: false,
      crossesSurah: false,
      affectedPages: 0,
      tailOverflow: "",
    };
  }

  const updates: CascadeRowUpdate[] = [
    { pageId: startPageId, rowIndex: startRowIndex, layer, text: newCurrentText },
  ];

  let carry = pushedText.trim();
  const affectedPageIds = new Set<string>([startPageId]);

  // Walk forward through scoped pages, starting at the row AFTER startRow.
  let pi = startPageIdx;
  let ri = startRowIndex + 1;

  while (carry !== "" && pi < allPages.length) {
    const page = allPages[pi];
    if (!page) break;

    if (ri >= page.lines.length) {
      pi += 1;
      ri = 0;
      continue;
    }

    const existing = getEffectiveText(
      page.id,
      ri,
      layer,
      page.lines,
      localMap,
      layerKeyFn,
    );
    const combined = existing ? carry + " " + existing : carry;
    const { fits, overflow } = splitToFit(
      combined,
      availableWidth,
      fontFamily,
      fontSize,
    );

    if (fits !== existing) {
      updates.push({ pageId: page.id, rowIndex: ri, layer, text: fits });
      affectedPageIds.add(page.id);
    }
    carry = overflow.trim();
    ri += 1;
  }

  const crossesPage = Array.from(affectedPageIds).some((pid) => pid !== startPageId);
  let crossesSurah = false;
  if (surahPageIds && surahPageIds.length > 0) {
    crossesSurah = Array.from(affectedPageIds).some((pid) => !surahPageIds.includes(pid));
  }

  return {
    rowUpdates: updates,
    crossesPage,
    crossesSurah,
    affectedPages: affectedPageIds.size,
    tailOverflow: carry,
  };
}
