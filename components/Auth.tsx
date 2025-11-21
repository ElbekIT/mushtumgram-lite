import React, { useState, useEffect } from 'react';
import { AppState } from '../types';

interface AuthProps {
  setAppState: (state: AppState) => void;
  setPhoneNumber: (number: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ setAppState, setPhoneNumber }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [inputNumber, setInputNumber] = useState('+998');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');

  // Timer logic
  const [timer, setTimer] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatPhoneNumber = (value: string) => {
    if (!value.startsWith('+998')) return '+998';
    const raw = value.replace(/[^\d+]/g, ''); 
    if (raw.length > 13) return raw.substring(0, 13); 
    return raw;
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (inputNumber.length < 13) {
      setError("Raqam noto'g'ri kiritildi. (+998...)");
      return;
    }
    setIsLoading(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setPhoneNumber(inputNumber);
      setTimer(120); // Reset timer
      setCanResend(false);
    }, 1500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // DEMO CODE VALIDATION
    if (otp !== '77777') {
      if (otp.length !== 5) {
         setError("Kod 5 xonali bo'lishi kerak.");
         return;
      }
      // Allow any 5 digit code in demo, but prefer 77777
    }
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAppState(AppState.MESSENGER);
    }, 1000);
  };

  const handleEditNumber = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  const saveSettings = () => {
    setShowSettings(false);
    alert("Sozlamalar saqlandi! (Demo rejimida API kalitlari faqat ko'rinish uchun)");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-100 font-sans relative">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">MTProto Sozlamalari</h2>
              <div className="text-sm text-gray-500 mb-6">
                 Haqiqiy Telegram API orqali ulanish uchun <a href="https://my.telegram.org" target="_blank" className="text-tg-primary underline">my.telegram.org</a> saytiga kiring.
                 <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-gray-600 space-y-1">
                    <p>💡 <b>Yordam:</b> Saytda ro'yxatdan o'tayotganda:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li><b>App title:</b> Ilova nomi (masalan: Mushtum)</li>
                      <li><b>Short name:</b> Qisqa nom (masalan: mushtum_v1)</li>
                      <li><b>URL:</b> <code className="bg-white px-1 rounded border border-gray-200 text-blue-600">http://localhost</code> deb yozing.</li>
                      <li><b>Platform:</b> Web</li>
                    </ul>
                 </div>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App API ID</label>
                    <input 
                      type="text" 
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition"
                      placeholder="12345678"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App API Hash</label>
                    <input 
                      type="text" 
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition font-mono text-sm"
                      placeholder="e.g. a1b2c3d4e5..."
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setShowSettings(false)} className="text-gray-500 font-medium hover:bg-gray-100 px-4 py-2 rounded-lg transition">Bekor qilish</button>
                 <button onClick={saveSettings} className="bg-tg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-500 transition shadow-sm">Saqlash</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white md:p-12 md:rounded-[30px] md:shadow-xl w-full max-w-[480px] transition-all duration-300 h-screen md:h-auto flex flex-col justify-center p-6 relative">
        
        {/* Settings Toggle Button */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8">
           <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-tg-primary transition p-2 rounded-full hover:bg-blue-50" title="Server Sozlamalari">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
           </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-tg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-white ml-[-4px] mt-1" viewBox="0 0 24 24" fill="currentColor">
               <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
             </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mushtumgram Lite</h1>
          
          {step === 'phone' ? (
            <p className="text-gray-500 text-base px-4">
              Mamlakatingiz va telefon raqamingizni kiriting.
            </p>
          ) : (
            <div className="space-y-2">
               <div className="flex items-center justify-center gap-2 text-lg font-medium text-gray-900">
                 <span>{inputNumber}</span>
                 <button onClick={handleEditNumber} className="text-tg-primary hover:text-blue-600">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                   </svg>
                 </button>
               </div>
               <p className="text-gray-500 text-sm">
                 Biz kodni <b className="text-gray-700">Telegram</b> ilovasiga yubordik.
               </p>
            </div>
          )}
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-8">
            <div className="relative group">
              <input
                type="tel"
                id="phone"
                value={inputNumber}
                onChange={(e) => setInputNumber(formatPhoneNumber(e.target.value))}
                className="peer w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg font-medium bg-white placeholder-transparent"
                placeholder="+998 90 123 45 67"
                autoFocus
              />
              <label 
                htmlFor="phone"
                className="absolute left-4 -top-2.5 bg-white px-1 text-xs font-medium text-tg-primary transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-tg-primary"
              >
                Telefon raqam
              </label>
            </div>

            {error && <div className="text-red-500 text-sm text-center font-medium animate-bounce">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-tg-primary text-white font-bold py-3.5 rounded-xl hover:bg-[#229ED9] active:scale-[0.98] transition-all duration-200 shadow-md flex justify-center items-center uppercase tracking-wider text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "DAVOM ETISH"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-8">
            <div className="relative">
              <input
                type="text"
                maxLength={5}
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="peer w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all text-2xl tracking-[0.5em] text-center font-bold bg-white placeholder-transparent"
                placeholder="•••••"
                autoFocus
              />
              <label 
                htmlFor="otp"
                className="absolute left-1/2 transform -translate-x-1/2 -top-2.5 bg-white px-2 text-xs font-medium text-tg-primary transition-all peer-placeholder-shown:top-3.5 peer-focus:-top-2.5"
              >
                Kodni kiriting
              </label>
            </div>
            
            {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}

            {/* Demo Hint */}
            <div className="text-center">
               <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                 Demo kod: <b>77777</b>
               </p>
            </div>
            
            {/* Timer / Resend Logic */}
            <div className="text-center text-sm">
               {canResend ? (
                 <button 
                   type="button" 
                   onClick={() => {
                     setTimer(120); 
                     setCanResend(false);
                     alert("SMS yuborish simulyatsiyasi: Kod 77777");
                   }}
                   className="text-tg-primary hover:underline font-medium"
                 >
                   Kod kelmadimi? SMS orqali yuborish
                 </button>
               ) : (
                 <p className="text-gray-400">
                   Kod kelmadimi? <span className="font-mono text-gray-600">{formatTime(timer)}</span> dan so'ng
                 </p>
               )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-tg-primary text-white font-bold py-3.5 rounded-xl hover:bg-[#229ED9] active:scale-[0.98] transition-all duration-200 shadow-md flex justify-center items-center uppercase tracking-wider text-sm"
            >
               {isLoading ? (
                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
               ) : (
                "TASDIQLASH"
               )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};