import { useEditorStore } from "@/state/editorStore";
import { useReflowStore } from "@/state/reflowStore";

/** Page id for scoped ops: selection → visible canvas page → first page. */
export function getContextPageId(): string | undefined {
  const selection = useEditorStore.getState().selection;
  const activePageId = useEditorStore.getState().activePageId;
  const pages = useReflowStore.getState().pages;
  return selection?.pageId ?? activePageId ?? pages[0]?.id;
}
