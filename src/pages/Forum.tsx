import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
}

export function Forum() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch('/api/forum/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Community Forum</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Join the discussion with other fans</p>
      </div>

      <div className="grid gap-6">
        {categories.map(category => (
          <Link key={category.id} to={`/forum/category/${category.id}`} className="group block">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md hover:border-yellow-500/50 flex items-start gap-6">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-yellow-500 transition-colors">
                  {category.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {category.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
