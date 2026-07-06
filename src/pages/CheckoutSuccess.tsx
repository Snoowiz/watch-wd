import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, LoaderCircle, AlertCircle } from 'lucide-react';
import { useAuthStore, usePurchaseStore } from '../store';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [error, setError] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/profile');

  useEffect(() => {
    let ignore = false;

    const verifyPayment = async () => {
      const sessionId = searchParams.get('token') || searchParams.get('session_id') || searchParams.get('reference');
      const txnId = searchParams.get('txn_id') || searchParams.get('trxref') || searchParams.get('reference');
      const gateway = searchParams.get('gateway') || (searchParams.get('trxref') ? 'paystack' : searchParams.get('token') ? 'paypal' : 'stripe');

      if (!txnId && !sessionId) {
        if (!ignore) {
          setStatus('failed');
          setError('Missing transaction ID');
        }
        return;
      }

      try {
        const res = await fetch('/api/checkout/gateway/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            txn_id: txnId,
            gateway
          })
        });

        let data;
        try {
          data = await res.json();
        } catch (e) {
          throw new Error('Server returned an invalid response');
        }

        if (!res.ok) {
           throw new Error(data?.error || data?.message || 'Verification rejected by server');
        }
        
        if (data.success || data.alreadyCompleted) {
          // Re-fetch user details to get new plan/balance
          const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (meRes.ok) {
             const meData = await meRes.json();
             if (!ignore) updateUser(meData.user);
          }
          try {
            await usePurchaseStore.getState().fetchPurchases();
          } catch (err) {
            console.error('Failed to fetch purchases in success page:', err);
          }
          if (!ignore) {
            setStatus('success');
            const target = data.matchSlug ? `/matches/${data.matchSlug}` : '/profile';
            setRedirectUrl(target);
            setTimeout(() => navigate(target), 3000);
          }
        } else {
          throw new Error(data.error || 'Verification failed format');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        if (!ignore) {
          setStatus('failed');
          setError(err.message || 'Payment Verification failed');
        }
      }
    };

    verifyPayment();

    return () => {
      ignore = true;
    };
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-700 text-center animate-in fade-in slide-in-from-bottom-10 duration-500">
        {status === 'verifying' && (
          <div className="space-y-6">
            <div className="mx-auto w-20 h-20 text-yellow-500 flex items-center justify-center animate-spin">
              <LoaderCircle className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Verifying Payment...
            </h2>
            <p className="text-slate-500">Please do not close this window.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Your transaction has been verified and applied to your account.
            </p>
            <p className="text-sm text-slate-400 animate-pulse">
              Redirecting to {redirectUrl === '/profile' ? 'profile' : 'match'}...
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {error}
            </p>
            <button
               onClick={() => navigate(redirectUrl)}
               className="w-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-xl transition-all"
            >
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
