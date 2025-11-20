import { useState, useEffect } from 'react';

type ViewportCategory = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

const screenBreakpoints = {
  md: 768,
  lg: 1024,
  xl: 1280,
};

const getViewportCategory = (width: number): ViewportCategory => {
  const { md, lg, xl } = screenBreakpoints;

  if (width < md) {
    return 'mobile';
  }
  if (width >= md && width < lg) {
    return 'tablet-portrait';
  }
  if (width >= lg && width < xl) {
    return 'tablet-landscape';
  }
  return 'desktop';
};

export const useViewportCategory = (): ViewportCategory => {
  const [viewportCategory, setViewportCategory] = useState<ViewportCategory>(getViewportCategory(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      setViewportCategory(getViewportCategory(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewportCategory;
};
