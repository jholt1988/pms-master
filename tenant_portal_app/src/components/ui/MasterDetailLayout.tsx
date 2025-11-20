import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useViewportCategory } from '../../hooks/useViewportCategory';

interface MasterDetailLayoutProps {
  master: React.ReactNode;
  detail: React.ReactNode | null;
  showDetail: boolean;
}

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({ master, detail, showDetail }) => {
  const viewport = useViewportCategory();
  const isMobile = viewport === 'mobile' || viewport === 'tablet-portrait';

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div className="relative w-full h-full overflow-hidden">
          <AnimatePresence initial={false}>
            {!showDetail && (
              <motion.div
                key="master"
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute w-full h-full"
              >
                {master}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showDetail && (
              <motion.div
                key="detail"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute w-full h-full bg-white dark:bg-black"
              >
                {detail}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-800">
            {master}
          </div>
          <div className="w-2/3">
            {detail}
          </div>
        </>
      )}
    </div>
  );
};
