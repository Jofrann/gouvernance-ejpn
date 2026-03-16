import { useEffect, useRef, useState } from 'react';

// Native-style pull-to-refresh hook for mobile
export default function usePullToRefresh(onRefresh, containerSelector = '.scrollable-safe') {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullThreshold = 80; // pixels to pull before triggering refresh

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const scrollTop = container.scrollTop;
      
      // Only allow pull-to-refresh when at the top
      if (scrollTop === 0) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        
        if (diff > pullThreshold && !isRefreshing) {
          setIsRefreshing(true);
          onRefresh?.();
          
          // Auto-reset after 1.5s
          setTimeout(() => setIsRefreshing(false), 1500);
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onRefresh, containerSelector, isRefreshing]);

  return { isRefreshing };
}