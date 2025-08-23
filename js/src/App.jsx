import { useEffect, useState } from "react";
import "./App.css";
import EasyLexicalEditor from "./lib/EasyLexicalEditor/EasyLexicalEditor.jsx";
import ResizableImage from "./lib/EasyLexicalEditor/components/resizableImage/ResizableImage.jsx";
import TestHeader from "./components/TestHeader.jsx";

function App() {
  const [contentList, setContentList] = useState([]);

  const [getEditorProps, setGetEditorProps] = useState(null);

  // ? test submit
  function onSubmit() {
    console.log("서브밋", getEditorProps);
    setContentList((prev) => {
      return [...prev, getEditorProps.html];
    });
  }

  useEffect(() => {}, []);

  return (
    <>
      <TestHeader onSubmit={onSubmit} />
      <div className={"easy_lexical_test_container"}>
        <div className={"easy_lexical_test_inner"}>
          <p className={"easy_lexical_test_title"}>Hello!</p>

          <EasyLexicalEditor
            showTerminal
            onChange={setGetEditorProps}
            // editorInnerInputHeight={"auto"}
          />
          {/*<EasyLexicalEditor onChange={setGetEditorProps} />*/}

          {/*<ResizableImage*/}
          {/*  src={"/노동짤.png"}*/}
          {/*  alt="gradient"*/}
          {/*  // initialWidth={320}*/}
          {/*  // maxWidth={800}*/}
          {/*  // minWidth={120}*/}
          {/*  lockAspectByDefault={false}*/}
          {/*  keepWithinParent*/}
          {/*  onResizeEnd={(size) => console.log("resized:", size)}*/}
          {/*/>*/}

          {contentList?.map((content, idx) => {
            return (
              <div key={"editor_content_" + idx} dangerouslySetInnerHTML={{ __html: content }} />
            );
          })}
        </div>
      </div>
    </>
  );
}

export default App;
