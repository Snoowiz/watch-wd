import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { MessageSquare, Lock, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface Topic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_avatar: string | null;
  is_locked: number;
  created_at: string;
}

interface Reply {
  id: number;
  content: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string;
  created_at: string;
}

export function ForumTopic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/forum/topics/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setTopic(data.topic);
        setReplies(data.replies);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');

    try {
      const res = await fetch(`/api/forum/topics/${id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newReply })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNewReply('');
      // Refresh replies
      const updatedRes = await fetch(`/api/forum/topics/${id}`);
      const updatedData = await updatedRes.json();
      setReplies(updatedData.replies);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4">Loading...</div>;
  if (error || !topic) return <div className="text-red-500">{error || 'Topic not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {topic.author_avatar ? (
              <img src={topic.author_avatar} alt={topic.author_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-500 font-bold text-lg">{topic.author_name[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{topic.title}</h1>
              {topic.is_locked === 1 && <Lock className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-6">
              <span className="font-medium text-slate-700 dark:text-slate-300">{topic.author_name}</span>
              <span>•</span>
              <span>
                {(() => {
                  try {
                    const date = new Date(topic.created_at);
                    if (isNaN(date.getTime())) return 'recently';
                    return formatDistanceToNow(date);
                  } catch (e) { return 'recently'; }
                })()} ago
              </span>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {topic.content}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {replies.length} Replies
        </h3>
        
        {replies.map(reply => (
          <div key={reply.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                {reply.author_avatar ? (
                  <img src={reply.author_avatar} alt={reply.author_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-500 font-bold">{reply.author_name[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">{reply.author_name}</span>
                  {reply.author_role === 'admin' && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-md uppercase">Admin</span>
                  )}
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                    {(() => {
                      try {
                        const date = new Date(reply.created_at);
                        if (isNaN(date.getTime())) return 'recently';
                        return formatDistanceToNow(date);
                      } catch (e) { return 'recently'; }
                    })()} ago
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-2">
                  {reply.content}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {topic.is_locked === 0 || user?.role === 'admin' ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <form onSubmit={handleReply} className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden prose-editor">
              <ReactQuill
                theme="snow"
                value={newReply}
                onChange={setNewReply}
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
            <div className="flex justify-end">
              <button 
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Post Reply
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-center border border-red-100 dark:border-red-500/20 flex items-center justify-center gap-2">
          <Lock className="w-5 h-5" />
          This topic is locked. You cannot reply.
        </div>
      )}
    </div>
  );
}
