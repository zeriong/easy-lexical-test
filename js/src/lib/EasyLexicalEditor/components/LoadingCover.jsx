import { AnimatePresence, motion } from "framer-motion";
import { INIT_MOTION_OPTION } from "../contants/common.js";

/**
 * @param {Object} props
 * @param {boolean} props.isLoading
 * */
export default function LoadingCover({ isLoading }) {
  return (
    <AnimatePresence mode={"wait"}>
      {isLoading && (
        <motion.div
          {...INIT_MOTION_OPTION}
          key={"loading-spinner"}
          className={"editor-loading-container"}
        >
          <div className={"editor-loading-content"}>
            {/* 로딩 아이콘 */}
            <div className="save-loading" />
            {/* 압축중 문구 */}
            <p>파일 압축중...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
