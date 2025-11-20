import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useViewportCategory } from '../../hooks/useViewportCategory';

interface TwoPaneLayoutProps {
  master: React.ReactNode;
  detail: React.ReactNode | null;
  showDetail: boolean;
}

/**
 * A generic master-detail layout component with two panes.
 *
 * On desktop and tablet landscape, it displays two columns: left (master) and right (detail).
 * On tablet portrait, it stacks the panes, showing only the master by default. When an item is selected,
 * it transitions to a full-screen detail view.
 *
 * @param {React.ReactNode} master - The content for the master pane (e.g., a list or table).
 * @param {React.ReactNode | null} detail - The content for the detail pane.
 * @param {boolean} showDetail - A boolean to control the visibility of the detail pane on smaller screens.
 */
export const TwoPaneLayout: React.FC<TwoPaneLayoutProps> = ({ master, detail, showDetail }) => {
  const viewport = useViewportCategory();

  const isMobile = viewport === 'mobile' || viewport === 'tablet-portrait';

  return (
    <div className="flex h-full">
      {isMobile ? (
        <div className="relative w-full h-full">
          <AnimatePresence>
            {!showDetail && (
              <motion.div
                key="master"
                initial={{ x: '-100%' }}
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
                className="absolute w-full h-full"
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
