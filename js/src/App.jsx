import { useEffect, useState } from "react";
import "./App.css";
import EasyLexicalEditor from "./lib/EasyLexicalEditor/EasyLexicalEditor.jsx";
import ResizableImage from "./lib/EasyLexicalEditor/components/resizableImage/ResizableImage.jsx";

function App() {
  const [contentList, setContentList] = useState([]);

  useEffect(() => {}, []);

  return (
    <div className={"easy_lexical_test_container"}>
      <div className={"easy_lexical_test_inner"}>
        <p className={"easy_lexical_test_title"}>Hello!</p>

        <EasyLexicalEditor showTerminal />

        <ResizableImage
          src={"/노동짤.png"}
          alt="gradient"
          // initialWidth={320}
          // maxWidth={800}
          // minWidth={120}
          lockAspectByDefault={false}
          keepWithinParent
          onResizeEnd={(size) => console.log("resized:", size)}
        />

        {contentList?.map((content) => {
          return <div dangerouslySetInnerHTML={{ __html: content }} />;
        })}
      </div>
    </div>
  );
}

export default App;
