import { useEffect, useRef } from 'react';

// Module-level stack and state
const layerStack: Array<{ id: number; close: () => void }> = [];
let idCounter = 1;
let ignoreNextPop = false;

function onPopState(_: PopStateEvent) {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }

  if (layerStack.length > 0) {
    const top = layerStack.pop();
    try {
      top?.close();
    } catch (e) {
      console.error('Error closing UI layer on popstate', e);
    }

    // Restore a history entry so that URL stays the same (prevents navigating away)
    // We set ignoreNextPop to avoid handling the pushState-generated pop
    ignoreNextPop = true;
    history.pushState({ restored: true }, '', location.href);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState);
}

// Hook used by UI layers (dialogs, drawers, modals) to participate in layered back behavior
export default function useLayeredBack(open: boolean | undefined, setOpen: ((v: boolean) => void) | undefined) {
  const layerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!setOpen) return; // nothing to register if no setter provided

    // When layer opens, register and push a history entry
    if (open) {
      const id = idCounter++;
      layerIdRef.current = id;
      const close = () => setOpen(false);
      layerStack.push({ id, close });
      try {
        history.pushState({ layerId: id }, '', location.href);
      } catch (e) {
        console.warn('pushState failed for layered back', e);
      }
    }

    // When layer closes, unregister and remove history entry if it belongs to us
    if (!open && layerIdRef.current) {
      const id = layerIdRef.current;
      const idx = layerStack.findIndex((l) => l.id === id);
      if (idx !== -1) layerStack.splice(idx, 1);

      // If the current history state is our layer, go back to remove it
      try {
        const st = history.state as any;
        if (st && st.layerId === id) {
          ignoreNextPop = true;
          history.back();
        }
      } catch (e) {
        // ignore
      }

      layerIdRef.current = null;
    }

    return () => {
      // Cleanup on unmount: if still registered, remove
      if (layerIdRef.current) {
        const id = layerIdRef.current;
        const idx = layerStack.findIndex((l) => l.id === id);
        if (idx !== -1) layerStack.splice(idx, 1);
        layerIdRef.current = null;
      }
    };
  }, [open, setOpen]);
}
