import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useReflowStore } from "@/state/reflowStore";
import type { PageDistribution } from "@/state/reflowStore";
import { useEditorStore } from "@/state/editorStore";

type Props = {
  pages?: unknown;
  activeId: string;
  onSelect: (id: string) => void;
};

const SURAH_NAMES: Record<number, string> = {
  1: "আল-ফাতিহা",
  2: "আল-বাকারা",
  3: "আলে ইমরান",
  4: "আন-নিসা",
  5: "আল-মায়িদাহ",
  6: "আল-আনআম",
  7: "আল-আরাফ",
  8: "আল-আনফাল",
  9: "আত-তাওবা",
};

const SURAH_NAMES_AR: Record<number, string> = {
  1: "الفاتحة",
  2: "البقرة",
  3: "آل عمران",
  4: "النساء",
  5: "المائدة",
  6: "الأنعام",
  7: "الأعراف",
  8: "الأنفال",
  9: "التوبة",
};

function bnNum(n: number | string): string {
  const map = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(n).replace(/\d/g, (d) => map[Number(d)]);
}

function surahNameBn(n: number): string {
  return SURAH_NAMES[n] ?? `সূরা ${bnNum(n)}`;
}
function surahNameAr(n: number): string {
  return SURAH_NAMES_AR[n] ?? `سورة ${n}`;
}

export function PageList({ activeId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const distribution = useReflowStore((s) => s.distribution);
  const expandedSurahs = useEditorStore((s) => s.expandedSurahs);
  const toggleSurah = useEditorStore((s) => s.toggleSurah);
  const expandSurah = useEditorStore((s) => s.expandSurah);

  // Group pages by surah, preserving insertion order
  const grouped = useMemo(() => {
    const map = new Map<number, PageDistribution[]>();
    for (const d of distribution) {
      const arr = map.get(d.surah);
      if (arr) arr.push(d);
      else map.set(d.surah, [d]);
    }
    return Array.from(map.entries()); // [ [surahNum, pages[]], ... ]
  }, [distribution]);

  // Filter at surah level by Arabic or Bengali name
  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return grouped;
    return grouped.filter(([s]) => {
      const bn = surahNameBn(s).toLowerCase();
      const ar = surahNameAr(s);
      return bn.includes(needle) || ar.includes(needle) || String(s).includes(needle);
    });
  }, [grouped, q]);

  const activeIdx = distribution.findIndex((d) => d.pageId === activeId);
  const activeData = distribution[activeIdx];

  // Auto-expand active surah on mount and when active changes
  useEffect(() => {
    if (activeData) expandSurah(activeData.surah);
  }, [activeData?.surah, expandSurah, activeData]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-neutral-800/80 bg-neutral-950 text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-neutral-800">
            <FileText className="h-3.5 w-3.5 text-amber-400" />
          </div>
          পেজ তালিকা
        </div>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          {distribution.length}
        </span>
      </div>

      {/* Active page indicator */}
      {activeData && (
        <div className="border-b border-neutral-800 bg-neutral-900/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">বর্তমান পেজ</span>
            <span className="text-[10px] font-bold text-amber-400">
              {activeIdx + 1} / {distribution.length}
            </span>
          </div>
          <div className="mt-1 text-xs font-medium text-neutral-200 truncate">
            {surahNameBn(activeData.surah)}
            {activeData.firstVerse != null && (
              <span className="ml-1 text-neutral-500">
                {bnNum(activeData.firstVerse)}–{bnNum(activeData.lastVerse ?? activeData.firstVerse)}
              </span>
            )}
          </div>
          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
              style={{ width: `${((activeIdx + 1) / distribution.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-neutral-800 px-2.5 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="সূরা খুঁজুন (Arabic/Bengali)…"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-100 placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Grouped Surah List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredGroups.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] text-neutral-600">
            কোনো সূরা পাওয়া যায়নি
          </div>
        ) : (
          filteredGroups.map(([surah, pages]) => {
            const isExpanded = expandedSurahs.has(surah);
            const containsActive = pages.some((p) => p.pageId === activeId);
            return (
              <div key={surah} className="border-b border-neutral-900/80">
                <button
                  onClick={() => toggleSurah(surah)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    containsActive
                      ? "bg-amber-500/5 hover:bg-amber-500/10"
                      : "hover:bg-neutral-900/60"
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  )}
                  <span
                    className={`flex h-5 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                      containsActive
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {bnNum(surah)}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span
                        dir="rtl"
                        className="truncate text-sm font-semibold text-neutral-100"
                        style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                      >
                        {surahNameAr(surah)}
                      </span>
                      <span className="truncate text-[10px] text-neutral-500">
                        {surahNameBn(surah)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400">
                      {bnNum(pages.length)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-neutral-950/60 pb-1">
                    {pages.map((d) => {
                      const active = d.pageId === activeId;
                      const ayahLabel =
                        d.firstVerse != null && d.lastVerse != null
                          ? `আয়াত ${bnNum(d.firstVerse)}–${bnNum(d.lastVerse)}`
                          : `পেজ ${bnNum(d.pageNo)}`;
                      return (
                        <button
                          key={d.pageId}
                          onClick={() => onSelect(d.pageId)}
                          className={`group flex w-full items-center gap-2.5 border-l-2 px-3 py-1.5 pl-9 text-left text-xs transition-all ${
                            active
                              ? "border-amber-400 bg-gradient-to-r from-amber-500/10 to-transparent text-amber-100"
                              : "border-transparent text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/60 hover:text-neutral-200"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-8 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${
                              active
                                ? "bg-amber-500/90 text-neutral-950"
                                : "bg-neutral-800/70 text-neutral-500"
                            }`}
                          >
                            {bnNum(d.pageNo)}
                          </span>
                          <span className="truncate text-[11px]">{ayahLabel}</span>
                          {active && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
