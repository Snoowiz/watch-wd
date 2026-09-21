import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useSettingsStore, usePurchaseStore } from '../store';
import { CheckCircle, Lock, Shield, LoaderCircle } from 'lucide-react';

export function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { amount: number; paymentMethod: string; returnUrl: string; description?: string; type?: string; metadata?: any; } | null;
  const { user, updateUser } = useAuthStore();
  const { addTransaction } = usePurchaseStore();
  const { currencySymbol, currency: platformCurrency } = useSettingsStore();
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!state || !user) {
      navigate('/');
      return;
    }
  }, [state, user, navigate]);

  const processPayment = async () => {
    setStatus('processing');
    setErrorMessage('');
    
    try {
      const payload: any = { 
        amount: state.amount, 
        gateway: state.paymentMethod,
        currency: platformCurrency || 'GBP'
      };

      let endpoint = '/api/checkout/gateway/initialize';

      if (state.type === 'plan') {
         payload.type = 'plan';
         payload.metadata = { 
           planId: state.metadata?.planId,
           matchId: state.metadata?.matchId || null,
           fromMatchSlug: state.metadata?.fromMatchSlug || null
         };
      } else if (state.metadata?.matchId) {
         payload.type = state.metadata.type || 'watch';
         payload.matchId = state.metadata.matchId;
         payload.metadata = { 
           matchId: state.metadata.matchId,
           fromMatchSlug: state.metadata.matchSlug || state.metadata.fromMatchSlug || null
         };
         // Use Stripe Connect PPV endpoint if payment gateway is Stripe
         if (state.paymentMethod === 'stripe') {
           endpoint = '/api/checkout/gateway/connect-ppv';
         }
      } else {
         payload.type = 'top_up';
         payload.metadata = {};
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      // Redirect to external checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorMessage(err.message || 'Payment initialization failed');
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleCancel = () => {
    navigate(state?.returnUrl || '/profile');
  };

  if (!state) return null;

  const getGatewayColor = () => {
    switch (state.paymentMethod) {
      case 'stripe': return 'text-indigo-500';
      case 'paypal': return 'text-blue-500';
      case 'paystack': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  const getGatewayName = () => {
    switch (state.paymentMethod) {
      case 'stripe': return 'Stripe';
      case 'paypal': return 'PayPal';
      case 'paystack': return 'Paystack';
      default: return 'Payment Gateway';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-700 text-center animate-in fade-in slide-in-from-bottom-10 duration-500">
        
        {status === 'idle' ? (
          <div className="space-y-6">
            <div className={`mx-auto w-16 h-16 ${getGatewayColor()} bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6`}>
              <Shield className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                Checkout
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Complete your transaction securely via <span className="font-semibold text-slate-700 dark:text-slate-300">{getGatewayName()}</span>.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{state.amount}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                onClick={processPayment}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 text-white shadow-lg ${
                  state.paymentMethod === 'stripe' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30' :
                  state.paymentMethod === 'paypal' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' :
                  'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'
                }`}
              >
                <Lock className="w-5 h-5" />
                Pay {currencySymbol}{state.amount} securely
              </button>
              <button 
                onClick={handleCancel}
                className="w-full py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : status === 'processing' ? (
          <div className="space-y-8">
            <div className={`mx-auto w-20 h-20 ${getGatewayColor()} flex items-center justify-center animate-spin`}>
              <LoaderCircle className="w-16 h-16" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                Processing Payment
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Please wait while we securely process your transaction via <span className="font-semibold text-slate-700 dark:text-slate-300">{getGatewayName()}</span>.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{state.amount}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> Secure</span>
              <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Encrypted</span>
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                Checkout Error
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {errorMessage || 'There was a problem initializing the payment.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center items-center justify-center">
              <CheckCircle className="w-12 h-12" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                Payment Successful!
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Your account balance has been updated with <span className="font-bold text-yellow-500">{currencySymbol}{state.amount}</span>.
              </p>
            </div>
            
            <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">
              Redirecting you back...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
