import { useToastStore } from "../store/toastStore";
import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

/**
 * 토스트 컴포넌트
 *
 * @desc 문자열뿐만 아니라 HTML 태그를 직접 넣어서 별도의 스타일을 적용할 수 있음
 * @example
 * const { addToast } = useToastStore;
 * addToast('토스트!');
 * addToast(<div className="text-red-500">빨간 글자 토스트!</div>);
 *
 * @param {Object} props
 * @param {React.CSSProperties} props.containerStyle - 컨테이너 inline-style
 * @param {number} props.showingDuration - 토스트 표시 ms기준 유지시간 ( default: 5000 )
 * @param {boolean} props.isAutoHidden - 토스트 클릭하기 전까지 띄운상태를 유지 ( default: true )
 */
export const Toasts = ({ containerStyle = {}, showingDuration = 5000, isAutoHidden = true }) => {
  const showStartTimeoutRef = useRef(null);
  const showEndTimeoutRef = useRef(null);
  const hiddenTimeoutRef = useRef(null);

  const toastDivRef = useRef(null);
  const prevMessage = useRef(null);
  const isRunRef = useRef(false);

  const [iconClassName, setIconClassName] = useState("/assets/svg/toast/success-icon.svg");

  const toastStore = useToastStore();

  // ? 타임아웃 해제 함수
  function clearTimeoutFunction(timeoutRef) {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  /**
   * 토스트 메시지를 숨기는 함수
   * @returns {void}
   */
  const hidden = () => {
    clearTimeoutFunction(showEndTimeoutRef);

    if (toastDivRef.current?.style) {
      toastDivRef.current.style.top = "0";
      toastDivRef.current.style.opacity = "0";
    }

    hiddenTimeoutRef.current = setTimeout(() => {
      if (toastDivRef.current?.style) {
        toastDivRef.current.style.display = "none";
      }

      if (useToastStore.getState().toasts.length !== 0) {
        useToastStore.getState().removeToast();
        show();
      } else {
        isRunRef.current = false;
      }
    }, 300);
  };

  /**
   * 토스트 메시지를 표시하는 함수
   * @returns {void}
   */
  const show = () => {
    // 메시지 중복 제거
    useToastStore.getState().removeDuplicates();

    // 이전 메시지와 동일한 내용이 있다면 삭제
    if (useToastStore.getState().toasts.some((msg) => msg.message === prevMessage.current)) {
      const filteredMessage = useToastStore
        .getState()
        .toasts.filter((msg) => msg.message !== prevMessage.current);
      useToastStore.getState().setToast(filteredMessage);
    }

    if (useToastStore.getState().toasts?.length > 0) {
      isRunRef.current = true;

      if (toastDivRef.current?.style) {
        toastDivRef.current.style.display = "flex";
        toastDivRef.current.style.top = "0";
        toastDivRef.current.style.opacity = "0";
      }

      console.log("Toasts! :", useToastStore.getState().toasts);

      // 이전 메시지 기록
      prevMessage.current = useToastStore.getState().toasts[0]?.message;

      // 토스트 타입별 아이콘 변경
      const toastType = useToastStore.getState().toasts[0]?.type;
      setIconClassName(toastType);

      // 등장 트랜지션
      showStartTimeoutRef.current = setTimeout(() => {
        if (toastDivRef.current?.style) {
          toastDivRef.current.style.top = "12px";
          toastDivRef.current.style.opacity = "1";
        }

        // 일정 시간 뒤 숨김
        if (isAutoHidden) {
          showEndTimeoutRef.current = setTimeout(() => {
            hidden();
          }, showingDuration);
        }
      });
    } else {
      prevMessage.current = null;
      isRunRef.current = false;
    }
  };

  // 토스트 메시지 감지 및 실행
  useEffect(() => {
    if (!isRunRef.current && useToastStore.getState().toasts?.length) {
      show();
    }
  }, [useToastStore.getState().toasts]);

  // init effect
  useEffect(() => {
    // cleanup
    return () => {
      clearTimeoutFunction(showEndTimeoutRef);
      clearTimeoutFunction(showStartTimeoutRef);
      clearTimeoutFunction(hiddenTimeoutRef);
    };
  }, []);

  return (
    <div
      ref={toastDivRef}
      className={`editor-toast-container`}
      style={containerStyle}
      onClick={hidden}
    >
      {toastStore.toasts.length >= 0 && (
        <div className="editor-toast-content-wrapper">
          <i className={iconClassName} />
          <div
            className="editor-toast-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(toastStore.toasts[0]?.message),
            }}
          />
        </div>
      )}
    </div>
  );
};
