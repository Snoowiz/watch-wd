import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';
import { DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch transactions');
      setTransactions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">View and monitor platform transactions</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
          {error}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Transaction ID</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Description/Type</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Gateway</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading && transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn, index) => (
                    <tr key={txn._id || txn.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs opacity-75">{txn.id || txn._id}</td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                         {txn.userEmail || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 capitalize">{txn.description || txn.type || "Unknown"}</td>
                      <td className="px-6 py-4 font-medium">
                        {txn.amount} {txn.currency || ''}
                      </td>
                      <td className="px-6 py-4 font-medium capitalize">
                        {txn.gateway || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          txn.status === 'completed' || txn.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                          txn.status === 'pending' || txn.status === 'processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        }`}>
                          {txn.status === 'completed' || txn.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> :
                           txn.status === 'pending' || txn.status === 'processing' ? <Clock className="w-3.5 h-3.5" /> :
                           <AlertCircle className="w-3.5 h-3.5" />}
                          <span className="capitalize">{txn.status || 'unknown'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(txn.date || Date.now()).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
