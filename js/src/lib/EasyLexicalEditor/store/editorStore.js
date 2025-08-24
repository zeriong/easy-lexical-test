import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * @typedef {Object} EditorStore
 * @property {boolean} isLoading
 * @property {(isLoading: boolean) => void} setIsLoading
 */

/**
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<EditorStore>>}
 */
export const useEditorStore = create(
  devtools((setState) => ({
    isLoading: false,

    /** @param {boolean} isLoading */
    setIsLoading: (isLoading) => {
      setState(() => ({ isLoading }));
    },
  })),
);
