import React, { useState, useEffect } from 'react';
import { AppState } from '../types';

interface AuthProps {
  setAppState: (state: AppState) => void;
  setPhoneNumber: (number: string) => void;
  setIsRealMode: (isReal: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({ setAppState, setPhoneNumber, setIsRealMode }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [inputNumber, setInputNumber] = useState('+998');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [apiId, setApiId] = useState('33172191');
  const [apiHash, setApiHash] = useState('241032b1c88887ccb91d0282ae2d5a4d');
  const [useRealBackend, setUseRealBackend] = useState(false);

  // Check for existing session on mount (Auto-Login)
  useEffect(() => {
    const checkSession = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/check-session');
            const data = await res.json();
            if (data.success) {
                setIsRealMode(true);
                setUseRealBackend(true);
                setAppState(AppState.MESSENGER);
            }
        } catch (e) {
            // Server not running or no session, normal login flow
        }
    };
    checkSession();
  }, []);

  const formatPhoneNumber = (value: string) => {
    if (!value.startsWith('+998')) return '+998';
    const raw = value.replace(/[^\d+]/g, ''); 
    if (raw.length > 13) return raw.substring(0, 13); 
    return raw;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (inputNumber.length < 13) {
      setError("Raqam noto'g'ri kiritildi.");
      return;
    }
    setIsLoading(true);
    
    if (useRealBackend) {
      try {
        const response = await fetch('http://localhost:3000/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: inputNumber, apiId, apiHash })
        });
        const data = await response.json();
        if (data.success) {
            setStep('otp');
            setPhoneNumber(inputNumber);
        } else {
            setError(data.error || "Server xatosi.");
        }
      } catch (err) {
          setError("Backendga ulanib bo'lmadi. `node server.js` ishlayaptimi?");
      } finally {
          setIsLoading(false);
      }
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setStep('otp');
        setPhoneNumber(inputNumber);
      }, 1000);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (useRealBackend) {
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: otp })
            });
            const data = await response.json();
            if (data.success) {
                setIsRealMode(true);
                setAppState(AppState.MESSENGER);
            } else {
                setError(data.error || "Kod noto'g'ri");
            }
        } catch (err) {
            setError("Login xatosi.");
        } finally {
            setIsLoading(false);
        }
    } else {
        setIsRealMode(false);
        setTimeout(() => {
            setIsLoading(false);
            setAppState(AppState.MESSENGER);
        }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-100 font-sans relative">
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Sozlamalar</h2>
              <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
                  <button onClick={() => setUseRealBackend(false)} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${!useRealBackend ? 'bg-white shadow text-blue-500' : 'text-gray-500'}`}>Demo</button>
                  <button onClick={() => setUseRealBackend(true)} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${useRealBackend ? 'bg-white shadow text-blue-500' : 'text-gray-500'}`}>Real (Node.js)</button>
              </div>
              {useRealBackend && <div className="mb-4 p-2 bg-blue-50 text-blue-800 text-xs rounded">Kali Linux terminalida <code>node server.js</code> ni ishga tushiring.</div>}
              <button onClick={() => setShowSettings(false)} className="w-full bg-blue-500 text-white py-2 rounded-lg">Saqlash</button>
           </div>
        </div>
      )}

      <div className="bg-white md:p-12 md:rounded-[30px] md:shadow-xl w-full max-w-[480px] h-screen md:h-auto flex flex-col justify-center p-6 relative">
        <div className="absolute top-6 right-6">
           <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#3390ec] rounded-full flex items-center justify-center mx-auto mb-6"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white ml-[-4px] mt-1" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mushtumgram Lite</h1>
          {useRealBackend && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">REAL SERVER</span>}
          <p className="text-gray-500 mt-2">{step === 'phone' ? "Telefon raqamingizni kiriting" : `${inputNumber} ga kod yuborildi`}</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <input type="tel" value={inputNumber} onChange={(e) => setInputNumber(formatPhoneNumber(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#3390ec] outline-none text-lg font-medium" placeholder="+998..."/>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <button type="submit" disabled={isLoading} className="w-full bg-[#3390ec] text-white font-bold py-3.5 rounded-xl hover:bg-[#229ED9] transition-all uppercase tracking-wider text-sm flex justify-center">
              {isLoading ? "Yuklanmoqda..." : "DAVOM ETISH"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <input type="text" maxLength={5} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#3390ec] outline-none text-2xl tracking-[0.5em] text-center font-bold" placeholder="•••••" autoFocus/>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            {!useRealBackend && <p className="text-center text-gray-400 text-sm">Demo kod: <b>77777</b></p>}
            <button type="submit" disabled={isLoading} className="w-full bg-[#3390ec] text-white font-bold py-3.5 rounded-xl hover:bg-[#229ED9] transition-all uppercase tracking-wider text-sm flex justify-center">
               {isLoading ? "Tekshirilmoqda..." : "TASDIQLASH"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};