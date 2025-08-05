import { useEffect, useState } from "react";
import EasyLexicalEditor from "./components/EasyLexicalEditor.tsx";

function App() {
  const [contentList, setContentList] = useState<any[]>([]);

  useEffect(() => {}, []);

  return (
    <div className={"easy_lexical_test_container"}>
      <div className={"easy_lexical_test_inner"}>
        <p className={"easy_lexical_test_title"}>Hello!</p>

        <EasyLexicalEditor />

        {contentList?.map((content) => {
          return <div dangerouslySetInnerHTML={{ __html: content }} />;
        })}
      </div>
    </div>
  );
}

export default App;
