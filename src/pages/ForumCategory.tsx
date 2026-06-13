import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { MessageSquare, Pin, Lock, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface Topic {
  id: number;
  title: string;
  author_name: string;
  reply_count: number;
  is_pinned: number;
  is_locked: number;
  created_at: string;
}

export function ForumCategory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetch(`/api/forum/categories/${id}/topics`)
      .then(res => res.json())
      .then(data => setTopics(data))
      .catch(console.error);
  }, [id]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');

    try {
      const res = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ category_id: id, title: newTitle, content: newContent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setIsCreating(false);
      navigate(`/forum/topic/${data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Category Topics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Join the discussion</p>
        </div>
        {user && (
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Topic
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <form onSubmit={handleCreateTopic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
              <input 
                type="text" 
                required 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                placeholder="Topic title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content</label>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden prose-editor">
                <ReactQuill
                  theme="snow"
                  value={newContent}
                  onChange={setNewContent}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                      ['link', 'image', 'video'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Post Topic
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {topics.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No topics yet. Be the first to start a discussion!
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {topics.map(topic => (
              <li key={topic.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Link to={`/forum/topic/${topic.id}`} className="block p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {topic.is_pinned === 1 && <Pin className="w-4 h-4 text-yellow-500" />}
                        {topic.is_locked === 1 && <Lock className="w-4 h-4 text-red-500" />}
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                          {topic.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {topic.author_name}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(topic.created_at))} ago</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {topic.reply_count} replies
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
