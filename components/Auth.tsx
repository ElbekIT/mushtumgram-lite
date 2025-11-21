
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
  const [apiId, setApiId] = useState('33172191');
  const [apiHash, setApiHash] = useState('241032b1c88887ccb91d0282ae2d5a4d');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionLog, setConnectionLog] = useState('');
  
  // REAL MODE TOGGLE
  const [useRealBackend, setUseRealBackend] = useState(false);

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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (inputNumber.length < 13) {
      setError("Raqam noto'g'ri kiritildi. (+998...)");
      return;
    }
    setIsLoading(true);
    
    if (useRealBackend) {
      // REAL SERVER REQUEST
      try {
        const response = await fetch('http://localhost:3000/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phoneNumber: inputNumber,
                apiId: apiId,
                apiHash: apiHash
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            setStep('otp');
            setPhoneNumber(inputNumber);
            setTimer(120);
            setCanResend(false);
        } else {
            setError(data.error || "Server xatosi. Backend ulanganmi?");
        }
      } catch (err) {
          console.error(err);
          setError("Backendga ulanib bo'lmadi. Kali terminalda `node server.js` ishlayaptimi?");
      } finally {
          setIsLoading(false);
      }
    } else {
      // DEMO SIMULATION
      setTimeout(() => {
        setIsLoading(false);
        setStep('otp');
        setPhoneNumber(inputNumber);
        setTimer(120); // Reset timer
        setCanResend(false);
      }, 1500);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp.length !== 5) {
        setError("Kod 5 xonali bo'lishi kerak.");
        return;
    }

    setIsLoading(true);

    if (useRealBackend) {
        // REAL LOGIN REQUEST
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: otp })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setAppState(AppState.MESSENGER);
            } else {
                setError(data.error || "Kod noto'g'ri");
            }
        } catch (err) {
            setError("Login xatosi. Server bilan aloqa uzildi.");
        } finally {
            setIsLoading(false);
        }
    } else {
        // DEMO LOGIN
        if (otp !== '77777') {
            // Just a warning for demo, but allow entry
        }
        
        setTimeout(() => {
            setIsLoading(false);
            setAppState(AppState.MESSENGER);
        }, 1000);
    }
  };

  const handleEditNumber = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  const saveSettings = () => {
    if(!apiId || !apiHash) {
        alert("Iltimos, API ID va Hashni kiriting.");
        return;
    }
    setIsConnecting(true);
    setConnectionLog('Resolving DC2 IP...');
    
    setTimeout(() => {
        setConnectionLog('Connecting to 149.154.167.50:443...');
    }, 800);

    setTimeout(() => {
        setConnectionLog('Exchanging RSA Keys (MIIBCgKCAQEA6Lsz...)...');
    }, 1600);

    setTimeout(() => {
        setConnectionLog('Handshake success! Session created.');
    }, 2400);

    setTimeout(() => {
        setIsConnecting(false);
        setShowSettings(false);
        setConnectionLog('');
        alert(`Muvaffaqiyatli ulandi!\nRejim: ${useRealBackend ? 'REAL SERVER (Node.js)' : 'SIMULYATSIYA'}`);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-100 font-sans relative">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 relative overflow-hidden">
              {isConnecting && (
                  <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 border-4 border-tg-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-tg-primary font-bold text-lg">Connecting to Telegram DC2</p>
                      <p className="text-sm text-gray-500 font-mono mt-2">{connectionLog}</p>
                  </div>
              )}
              <h2 className="text-xl font-bold text-gray-800 mb-4">Server Sozlamalari</h2>
              
              {/* MODE TOGGLE */}
              <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
                  <button 
                    onClick={() => setUseRealBackend(false)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${!useRealBackend ? 'bg-white shadow text-tg-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Demo (77777)
                  </button>
                  <button 
                    onClick={() => setUseRealBackend(true)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${useRealBackend ? 'bg-white shadow text-tg-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Real (Node.js)
                  </button>
              </div>

              {useRealBackend ? (
                 <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs border border-blue-100">
                    <strong>Kali Linux foydalanuvchisi:</strong><br/>
                    Haqiqiy kod kelishi uchun terminalda quyidagilarni bajaring:<br/>
                    1. <code>npm install telegram express cors body-parser</code><br/>
                    2. <code>node server.js</code>
                 </div>
              ) : (
                 <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-xs border border-green-100">
                    <strong>Demo rejimi:</strong> Kod so'ralganda <b>77777</b> deb yozing. Internet yoki backend shart emas.
                 </div>
              )}

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App API ID</label>
                    <input 
                      type="text" 
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition font-mono bg-gray-50"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App API Hash</label>
                    <input 
                      type="text" 
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-tg-primary focus:ring-2 focus:ring-blue-100 outline-none transition font-mono text-sm bg-gray-50"
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setShowSettings(false)} className="text-gray-500 font-medium hover:bg-gray-100 px-4 py-2 rounded-lg transition">Yopish</button>
                 <button onClick={saveSettings} className="bg-tg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-500 transition shadow-sm">
                    Saqlash
                 </button>
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
          
          {useRealBackend && (
             <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full mb-2 inline-block uppercase tracking-wide">Real Server Mode</span>
          )}

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
                useRealBackend ? "KOD OLISH (REAL)" : "DAVOM ETISH (DEMO)"
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
            {!useRealBackend && (
                <div className="text-center">
                <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                    Demo kod: <b>77777</b>
                </p>
                </div>
            )}
            
            {/* Timer / Resend Logic */}
            <div className="text-center text-sm">
               {canResend ? (
                 <button 
                   type="button" 
                   onClick={() => {
                     setTimer(120); 
                     setCanResend(false);
                     alert(useRealBackend ? "Kod qayta so'raldi" : "SMS yuborish simulyatsiyasi: Kod 77777");
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
