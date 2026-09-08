import React from 'react';
import { HomepageBlock } from '../../../store';

export function SpacerBlock({ block }: { block: HomepageBlock }) {
  const height = block.config?.height || 'md';
  const showDivider = block.config?.showDivider !== false;

  const heightClass = {
    sm: 'py-3',
    md: 'py-6',
    lg: 'py-10',
    xl: 'py-16'
  }[height as 'sm' | 'md' | 'lg' | 'xl'] || 'py-6';

  return (
    <div className={`w-full ${heightClass} flex items-center justify-center`}>
      {showDivider && (
        <hr className="w-full border-slate-200/80 dark:border-slate-800" />
      )}
    </div>
  );
}
