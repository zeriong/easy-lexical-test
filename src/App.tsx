import { useState } from 'react'
import EasyLexicalEditor from "./components/EasyLexicalEditor.tsx";

function App() {
    const [contentList, setContentList] = useState<any[]>([])

  return (
    <div className={"easy_lexical_test_container"}>
        <div className={"easy_lexical_test_inner"}>
            <p className={"easy_lexical_test_title"}>Hello!</p>

            {contentList?.map((content) => {
                return <div dangerouslySetInnerHTML={{ __html: content }} />
            })}
        </div>

        <EasyLexicalEditor/>
    </div>
  )
}

export default App
