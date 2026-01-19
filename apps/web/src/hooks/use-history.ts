"use client";

import { useState } from "react";

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const current = history[index];

  const push = (state: T) => {
    const newHistory = history.slice(0, index + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const redo = () => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  };

  return {
    state: current,
    push,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}
