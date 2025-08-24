import { useToastStore } from "../lib/EasyLexicalEditor/store/toastStore.jsx";
import { useEditorStore } from "../lib/EasyLexicalEditor/store/editorStore.js";

export default function TestHeader({ onSubmit }) {
  const { addToast } = useToastStore();
  const { setIsLoading, isLoading } = useEditorStore();

  return (
    <header className={"easy_lexical_test_header"}>
      <button className={"easy_lexical_test_button register"} type={"button"} onClick={onSubmit}>
        작성
      </button>

      <div
        className={"easy_lexical_test_button"}
        onClick={() => {
          setIsLoading(!isLoading);
        }}
      >
        로딩 띄우기 토글
      </div>
      <div
        className={"easy_lexical_test_button"}
        onClick={() => {
          addToast.success("Success!");
        }}
      >
        성공 토스트
      </div>
      <div
        className={"easy_lexical_test_button"}
        onClick={() => {
          addToast.warn(`업로드에 실패하였습니다, 관리자에게 문의해주세요.`);
        }}
      >
        경고 토스트
      </div>
      <div
        className={"easy_lexical_test_button"}
        onClick={() => {
          addToast.error("Error!");
        }}
      >
        에러 토스트
      </div>
    </header>
  );
}
