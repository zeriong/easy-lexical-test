import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * @typedef {"success" | "warn" | "error"} ToastType
 */

/**
 * @typedef {Object} Toast
 * @property {string | import("react").ReactNode} message
 * @property {ToastType} type
 */

/**
 * @typedef {Object} ToastsStore
 * @property {Toast[]} toasts
 * @property {((message: string | import("react").ReactNode) => void) & {
 *   success: (message: string | import("react").ReactNode) => void,
 *   warn: (message: string | import("react").ReactNode) => void,
 *   error: (message: string | import("react").ReactNode) => void
 * }} addToast
 * @property {(messages: any) => void} setToast
 * @property {() => void} removeToast
 * @property {() => void} removeDuplicates
 */

/**
 * @desc 토스트알림에 대한 상태관리 store
 * 문자열뿐 아니라 ReactNode(예: HTML 태그)를 직접 넣어서 별도의 스타일도 추가 가능
 *
 * @example
 * const { addToast } = useToastStore.getState();
 * addToast('토스트!');
 * addToast(<div className="text-red-500">빨간 글자 토스트!</div>);
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<ToastsStore>>}
 */
export const useToastStore = create(
  devtools((setState) => ({
    toasts: [],
    addToast: Object.assign(
      /** @param {string | import("react").ReactNode} message */
      (message) => {
        setState((state) => ({
          toasts: [...state.toasts, { message, type: "success" }],
        }));
      },
      {
        /** @param {string | import("react").ReactNode} message */
        success: (message) => {
          setState((state) => ({
            toasts: [...state.toasts, { message, type: "success" }],
          }));
        },
        /** @param {string | import("react").ReactNode} message */
        warn: (message) => {
          setState((state) => ({
            toasts: [...state.toasts, { message, type: "warn" }],
          }));
        },
        /** @param {string | import("react").ReactNode} message */
        error: (message) => {
          setState((state) => ({
            toasts: [...state.toasts, { message, type: "error" }],
          }));
        },
      },
    ),
    /** @param {any} messages */
    setToast: (messages) => {
      setState(() => ({ toasts: messages }));
    },
    removeToast: () =>
      setState((state) => {
        state.toasts.shift();
        return { toasts: [...state.toasts] };
      }),
    removeDuplicates: () => {
      setState((state) => {
        const convert = new Set(state.toasts);
        return { toasts: [...convert] };
      });
    },
  })),
);
