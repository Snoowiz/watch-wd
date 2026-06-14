import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore, useSettingsStore, usePurchaseStore } from '../store';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  directCheckoutAmount?: number;
  directCheckoutType?: 'watch' | 'embed' | 'plan';
  directCheckoutMetadata?: any;
}

export function AddFundsModal({ isOpen, onClose, directCheckoutAmount, directCheckoutType, directCheckoutMetadata }: AddFundsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const { currency, currencySymbol, paymentSettings } = useSettingsStore();
  const { addTransaction } = usePurchaseStore();
  
  const [amount, setAmount] = useState<number>(directCheckoutAmount || 10);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'paystack' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError('');

    onClose();
    navigate('/checkout', {
      state: {
        amount,
        paymentMethod,
        returnUrl: location.pathname,
        type: directCheckoutType,
        metadata: directCheckoutMetadata
      }
    });
  };

  const hasPaymentMethods = paymentSettings.stripe.enabled || paymentSettings.paypal.enabled || paymentSettings.paystack?.enabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {directCheckoutType ? 'Checkout' : 'Add Funds'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h3>
              <p className="text-slate-500 dark:text-slate-400">
                You have received {currencySymbol}{amount}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Amount ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="font-bold text-slate-400 text-lg">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    disabled={!!directCheckoutAmount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {!hasPaymentMethods ? (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No payment methods are currently configured. Please contact the administrator.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Payment Method
                  </label>
                  
                  {paymentSettings.stripe.enabled && (
                    <button
                      onClick={() => setPaymentMethod('stripe')}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'stripe' 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        paymentMethod === 'stripe' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">Credit Card (Stripe)</div>
                        {paymentSettings.stripe.isTestMode && (
                          <div className="text-xs text-indigo-500 font-medium">Test Mode Active</div>
                        )}
                      </div>
                    </button>
                  )}

                  {paymentSettings.paypal.enabled && (
                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'paypal' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        paymentMethod === 'paypal' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {currencySymbol}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">PayPal</div>
                        {paymentSettings.paypal.isTestMode && (
                          <div className="text-xs text-blue-500 font-medium">Test Mode Active</div>
                        )}
                      </div>
                    </button>
                  )}

                  {paymentSettings.paystack?.enabled && (
                    <button
                      onClick={() => setPaymentMethod('paystack')}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'paystack' 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        paymentMethod === 'paystack' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {currencySymbol}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">Paystack</div>
                        {paymentSettings.paystack?.isTestMode && (
                          <div className="text-xs text-emerald-500 font-medium">Test Mode Active</div>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={!paymentMethod || isProcessing || amount <= 0 || !hasPaymentMethods}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  !paymentMethod || isProcessing || amount <= 0 || !hasPaymentMethods
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-500/30'
                }`}
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  `Pay ${amount} ${currency}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
