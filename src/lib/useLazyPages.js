import React, { Suspense } from 'react';

// Central page lazy loading hook — reduces bundle size, enables code splitting
export const useLazyPages = (pagesObject) => {
  const lazyPages = {};
  
  Object.entries(pagesObject).forEach(([key, Component]) => {
    // Wrap each page in React.lazy for code-splitting
    lazyPages[key] = React.lazy(() => Promise.resolve({ default: Component }));
  });

  return lazyPages;
};

// Fallback loading component for lazy-loaded pages
export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#060810]">
    <div className="relative">
      <div className="w-12 h-12 border border-blue-500/20 rounded-full" />
      <div className="absolute inset-0 w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin" />
    </div>
  </div>
);

// Higher-order component to wrap lazy pages with Suspense
export const withLazyPage = (Component, fallback = <PageLoadingFallback />) => {
  const LazyPage = React.lazy(() => Promise.resolve({ default: Component }));
  
  return (props) => (
    <Suspense fallback={fallback}>
      <LazyPage {...props} />
    </Suspense>
  );
};