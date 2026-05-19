import { useCallback, useEffect, useState } from "react";

import { findPack } from "@/data/manifest";
import { useSessionStore } from "@/store/session";
import type { VocabularyWord } from "@/types";

interface State {
  loading: boolean;
  error: string | null;
  words: VocabularyWord[];
}

/**
 * Hook responsible for resolving the active pack id (from the session or the
 * sidebar) into its words, with lazy loading and rehydration on refresh.
 */
export function usePackSelection() {
  const session = useSessionStore((s) => s.session);
  const packWords = useSessionStore((s) => s.packWords);
  const rehydratePack = useSessionStore((s) => s.rehydratePack);
  const [state, setState] = useState<State>({ loading: false, error: null, words: [] });

  useEffect(() => {
    if (!session) {
      setState({ loading: false, error: null, words: [] });
      return;
    }
    // packWords is in-memory and is reset whenever a new pack is selected
    // (via startSession). It is *not* persisted, so after a page refresh it
    // will be empty even though `session` is restored — that's when we lazy
    // load the pack again below.
    if (packWords.length > 0 && packWords.length === session.wordIds.length) {
      setState({ loading: false, error: null, words: packWords });
      return;
    }
    const pack = findPack(session.packId);
    if (!pack) {
      setState({ loading: false, error: `Pack ${session.packId} not found`, words: [] });
      return;
    }
    let cancelled = false;
    setState({ loading: true, error: null, words: [] });
    pack
      .load()
      .then((words) => {
        if (cancelled) return;
        rehydratePack(session.packId, words);
        setState({ loading: false, error: null, words });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: String(err), words: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [session, packWords, rehydratePack]);

  const loadPack = useCallback(async (packId: string) => {
    const pack = findPack(packId);
    if (!pack) throw new Error(`Pack ${packId} not found`);
    return pack.load();
  }, []);

  return { ...state, loadPack };
}
