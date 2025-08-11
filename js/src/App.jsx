import { useEffect, useState } from "react";
import "./App.css";
import EasyLexicalEditor from "./lib/EasyLexicalEditor.jsx";

function App() {
  const [contentList, setContentList] = useState([]);

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
