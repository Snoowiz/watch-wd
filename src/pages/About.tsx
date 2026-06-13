import React, { useEffect, useState } from 'react';
import { getPageSettings } from '../services/settingsService';

export function About() {
  const [content, setContent] = useState('');
  
  useEffect(() => {
    getPageSettings().then(data => setContent(data.about));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div 
        className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 [&>h1]:text-3xl [&>h1]:font-black [&>h1]:mb-6 [&>h1]:text-slate-900 [&>h1]:dark:text-white"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
}
