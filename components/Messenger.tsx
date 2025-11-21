import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message } from '../types';
import { getChatResponse } from '../services/geminiService';

interface MessengerProps {
  currentUserPhone: string;
  isRealMode: boolean;
}

const savedMessagesContact: Contact = {
    id: 'saved',
    name: 'Saved Messages',
    avatar: 'saved-messages', 
    lastMessage: '', 
    lastMessageTime: '',
    unreadCount: 0,
    isOnline: true,
    isSavedMessages: true,
    isRealContact: false
};

const demoBots: Contact[] = [
  {
    id: '1',
    name: 'Mushtum Bot',
    avatar: 'https://picsum.photos/seed/mushtum/200/200',
    lastMessage: 'Welcome to Mushtumgram Lite!',
    lastMessageTime: '10:00',
    unreadCount: 1,
    isOnline: true,
    systemInstruction: "You are the official Mushtumgram bot. Be helpful, polite and official. Speak Uzbek.",
    isRealContact: false
  },
  {
    id: '2',
    name: 'Toshmat Aka',
    avatar: 'https://picsum.photos/seed/toshmat/200/200',
    lastMessage: 'Choyxonaga kelasanmi?',
    lastMessageTime: '09:45',
    unreadCount: 3,
    isOnline: false,
    systemInstruction: "Sen Toshmat akasan. 45 yoshli o'zbek erkak. Choyxona, palov haqida gapirasan. Qo'polroq lekin samimiy.",
    isRealContact: false
  },
];

export const Messenger: React.FC<MessengerProps> = ({ currentUserPhone, isRealMode }) => {
  // In Real Mode, start only with Saved Messages. In Demo mode, show Bots.
  const [contacts, setContacts] = useState<Contact[]>(isRealMode ? [savedMessagesContact] : [savedMessagesContact, ...demoBots]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); 
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeContact = contacts.find(c => c.id === activeChatId);
  const currentInput = activeChatId ? (inputMap[activeChatId] || '') : '';

  const fetchRealChats = async () => {
    setIsLoadingChats(true);
    try {
        const response = await fetch('http://localhost:3000/api/get-dialogs');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.chats)) {
            const realContacts: Contact[] = data.chats.map((c: any) => ({
                id: c.id,
                name: c.name || "Nomsiz foydalanuvchi",
                avatar: `https://ui-avatars.com/api/?name=${c.name}&background=random&color=fff&background=3390ec`,
                lastMessage: c.lastMessage || "",
                lastMessageTime: new Date(c.date * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                unreadCount: c.unreadCount,
                isOnline: false,
                isRealContact: true,
                isSavedMessages: false
            }));
            // IMPORTANT: In Real Mode, do NOT show AI bots to avoid API Key errors
            setContacts([savedMessagesContact, ...realContacts]);
        } else {
            console.warn("No chats returned or error", data);
        }
    } catch (e) {
        console.error("Failed to fetch real chats", e);
        // Optionally alert user if manual refresh
    } finally {
        setIsLoadingChats(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isRealMode) {
        fetchRealChats();
    }
  }, [isRealMode]);

  useEffect(() => {
    if (activeChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, activeChatId, isTyping]);

  const handleContactClick = (id: string) => {
    setActiveChatId(id);
    setIsMobileListOpen(false);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
  };

  const handleBackToList = () => {
    setIsMobileListOpen(true);
    setActiveChatId(null);
  };

  const handleInputChange = (val: string) => {
    if (activeChatId) {
      setInputMap(prev => ({ ...prev, [activeChatId]: val }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !currentInput.trim() || !activeContact) return;

    const text = currentInput.trim();
    setInputMap(prev => ({ ...prev, [activeChatId]: '' }));

    const newMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'me',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));

    setContacts(prev => {
        const updated = prev.map(c => c.id === activeChatId ? {
            ...c, 
            lastMessage: text,
            lastMessageTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        } : c);
        const active = updated.find(c => c.id === activeChatId);
        const others = updated.filter(c => c.id !== activeChatId);
        return active ? [active, ...others] : others;
    });

    // 1. IF REAL CONTACT -> SEND TO SERVER
    if (activeContact.isRealContact) {
        try {
            await fetch('http://localhost:3000/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: activeContact.id,
                    message: text
                })
            });
             setMessages(prev => {
                const chatMsgs = prev[activeChatId] || [];
                return {
                    ...prev,
                    [activeChatId]: chatMsgs.map(m => m.id === newMessage.id ? {...m, status: 'read'} : m)
                };
            });
        } catch (e) {
            console.error("Failed to send real message", e);
            alert("Xabar ketmadi. Serverga ulanishni tekshiring.");
        }
        return; 
    }

    // 2. IF SAVED MESSAGES
    if (activeContact.isSavedMessages) {
      setTimeout(() => {
        setMessages(prev => {
           const chatMsgs = prev[activeChatId] || [];
           return {
             ...prev,
             [activeChatId]: chatMsgs.map(m => m.id === newMessage.id ? {...m, status: 'read'} : m)
           };
        });
      }, 300);
      return;
    }

    // 3. IF AI BOT (Only available in Demo mode now)
    setIsTyping(true);

    const chatHistory = (messages[activeChatId] || []).map(m => ({
      role: m.sender === 'me' ? 'user' as const : 'model' as const,
      parts: [{ text: m.text }]
    }));

    const responseText = await getChatResponse(activeContact, text, chatHistory);

    setIsTyping(false);

    const replyMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: 'other',
      timestamp: new Date(),
      status: 'read'
    };

    setMessages(prev => {
       const chatMsgs = prev[activeChatId] || [];
       const updatedUserMsgs = chatMsgs.map(m => m.status === 'sent' ? {...m, status: 'read' as const} : m);
       return {
        ...prev,
        [activeChatId]: [...updatedUserMsgs, replyMessage]
       };
    });
    
    setContacts(prev => {
        const updated = prev.map(c => c.id === activeChatId ? {
            ...c, 
            lastMessage: responseText,
            lastMessageTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        } : c);
        return updated;
    });
  };

  // --- Icons & Render Helpers ---
  const renderAvatar = (contact: Contact, size: string = "w-12 h-12") => {
    if (contact.isSavedMessages) {
      return (
        <div className={`${size} rounded-full bg-[#3390ec] flex items-center justify-center`}>
           <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
           </svg>
        </div>
      );
    }
    return <img src={contact.avatar} alt={contact.name} className={`${size} rounded-full object-cover bg-gray-200`} />;
  };

  const MenuIcon = () => (<svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
  const SearchIcon = () => (<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>);
  const BackIcon = () => (<svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
  const RefreshIcon = () => (<svg className={`w-5 h-5 text-gray-500 ${isLoadingChats ? 'animate-spin text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>);

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      
      {/* Drawer Logic (Same as before) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300" onClick={() => setIsDrawerOpen(false)}></div>
      )}
      <div className={`fixed inset-y-0 left-0 w-[300px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="bg-[#3390ec] p-6 flex flex-col justify-end h-44">
            <div className="flex justify-between items-start mb-4">
               <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold text-white">{currentUserPhone.slice(-2) || "MG"}</div>
            </div>
            <div className="text-white">
               <h3 className="font-bold text-lg">{isRealMode ? "Real Telegram" : "Mushtum User"}</h3>
               <p className="text-blue-100 text-sm font-mono">{currentUserPhone}</p>
            </div>
         </div>
         <div className="py-2">
             <div onClick={() => { handleContactClick('saved'); setIsDrawerOpen(false); }} className="flex items-center px-6 py-3.5 hover:bg-gray-100 cursor-pointer">
               <div className="w-6 h-6 mr-6 text-gray-500"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg></div>
               <span className="font-medium">Saved Messages</span>
             </div>
             <div className="px-6 py-3 text-xs text-gray-400 border-t mt-2">
               <p className="mt-1 text-green-600 font-bold">{isRealMode ? "• ONLINE (Real)" : "• DEMO MODE"}</p>
             </div>
         </div>
      </div>

      {/* Sidebar List */}
      <div className={`${isMobileListOpen ? 'w-full md:w-[420px]' : 'hidden md:flex md:w-[420px]'} flex-col border-r border-gray-200 h-full bg-white z-20`}>
        <div className="px-4 py-3 flex items-center justify-between gap-4">
           <button onClick={() => setIsDrawerOpen(true)} className="p-1.5 rounded-full hover:bg-gray-100"><MenuIcon /></button>
           <div className="relative flex-1 group">
              <input type="text" placeholder="Search" className="w-full bg-[#f4f4f5] rounded-full py-2 pl-10 pr-4 focus:bg-white focus:ring-2 focus:ring-[#3390ec] focus:outline-none transition text-[15px] h-10"/>
              <div className="absolute left-3.5 top-2.5 pointer-events-none"><SearchIcon /></div>
           </div>
           {isRealMode && (
               <button onClick={fetchRealChats} className="p-1.5 rounded-full hover:bg-gray-100" title="Refresh Contacts">
                   <RefreshIcon />
               </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {contacts.length === 0 && isRealMode && (
             <div className="text-center mt-10 text-gray-500 text-sm px-6">
                <p>Kontaktlar yuklanmadi.</p>
                <button onClick={fetchRealChats} className="text-blue-500 underline mt-2">Qayta urinish</button>
             </div>
          )}
          {contacts.map(contact => (
            <div key={contact.id} onClick={() => handleContactClick(contact.id)} className={`flex items-center px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors duration-200 ${activeChatId === contact.id ? 'bg-[#3390ec] text-white' : 'hover:bg-[#f4f4f5]'}`}>
              <div className="relative flex-shrink-0">
                {renderAvatar(contact, "w-[54px] h-[54px]")}
                {contact.isOnline && !contact.isSavedMessages && <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-[2px] rounded-full ${activeChatId === contact.id ? 'bg-white border-[#3390ec]' : 'bg-[#00c73e] border-white'}`}></div>}
              </div>
              <div className="ml-3 flex-1 overflow-hidden min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold truncate text-[16px] ${activeChatId === contact.id ? 'text-white' : 'text-black'}`}>{contact.name}</h3>
                  <span className={`text-[12px] flex-shrink-0 ${activeChatId === contact.id ? 'text-white/80' : 'text-gray-400'}`}>{contact.lastMessageTime}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className={`text-[15px] truncate flex-1 mr-2 ${activeChatId === contact.id ? 'text-white/90' : 'text-gray-500'}`}>
                    {contact.isSavedMessages && !contact.lastMessage ? <span className="opacity-70">Saved Messages</span> : contact.lastMessage}
                  </p>
                  {contact.unreadCount > 0 && <span className={`text-[12px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full ${activeChatId === contact.id ? 'bg-white text-[#3390ec]' : 'bg-[#c4c9cc] text-white'}`}>{contact.unreadCount}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {activeChatId && activeContact ? (
        <div className={`${!isMobileListOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full relative bg-[#87a7bf]`}>
           <div className="absolute inset-0 tg-pattern opacity-60 pointer-events-none"></div>
          {/* Header */}
          <div className="relative z-10 bg-white px-4 py-2 flex items-center justify-between shadow-sm cursor-pointer h-14 flex-shrink-0">
             <div className="flex items-center flex-1">
                <button onClick={handleBackToList} className="mr-3 md:hidden p-1 -ml-1 rounded-full hover:bg-gray-100"><BackIcon /></button>
                {renderAvatar(activeContact, "w-9 h-9")}
                <div className="ml-3 flex flex-col justify-center">
                   <h2 className="font-bold text-black leading-tight text-[16px]">{activeContact.name}</h2>
                   {!activeContact.isSavedMessages && <p className="text-[13px] text-gray-500 leading-tight mt-0.5">{isTyping ? <span className="text-[#3390ec]">yozmoqda...</span> : (activeContact.isOnline ? <span className="text-[#3390ec]">online</span> : 'last seen recently')}</p>}
                </div>
             </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:px-16 lg:py-4 space-y-2 relative z-10 custom-scrollbar flex flex-col">
            {activeContact.isSavedMessages && (!messages[activeChatId] || messages[activeChatId].length === 0) ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center pb-20 animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-[#3390ec] rounded-full flex items-center justify-center shadow-lg mb-6">
                     <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  </div>
                  <h3 className="text-black font-semibold text-lg mb-4 shadow-sm bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm">Sizning bulutli xotirangiz</h3>
               </div>
            ) : (
              <>
                {messages[activeChatId]?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-1.5 group`}>
                     <div className={`max-w-[85%] lg:max-w-[560px] relative message-shadow px-3 py-[6px] text-[16px] leading-snug whitespace-pre-wrap break-words ${msg.sender === 'me' ? 'bg-[#eeffde] text-black rounded-2xl rounded-tr-sm' : 'bg-white text-black rounded-2xl rounded-tl-sm'}`}>
                        <span className="relative z-10">{msg.text}</span>
                        <span className={`float-right text-[11px] ${msg.sender === 'me' ? 'text-[#4fae4e]' : 'text-[#a0acb6]'} ml-2 mt-1`}>
                           {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                     </div>
                  </div>
                ))}
                {/* Typing Indicator */}
                {isTyping && (
                   <div className="flex justify-start mb-2">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm ml-2 flex space-x-1.5">
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-bounce delay-100"></div>
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="relative z-20 bg-white px-3 py-2 md:px-4 flex-shrink-0">
             <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-[700px] mx-2">
               <div className="flex-1 bg-white flex items-center py-2 relative">
                 <input ref={inputRef} type="text" value={currentInput} onChange={(e) => handleInputChange(e.target.value)} placeholder="Xabar..." className="w-full bg-transparent border-none outline-none text-black placeholder-gray-400 text-[16px]"/>
               </div>
               <button type="submit" className="p-2 text-[#3390ec] hover:bg-blue-50 rounded-full transition"><svg className="w-8 h-8 transform transition hover:scale-110" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg></button>
             </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#87a7bf] relative">
             <div className="absolute inset-0 tg-pattern opacity-60 pointer-events-none"></div>
             <div className="z-10 bg-[#212121]/40 px-4 py-1.5 rounded-full text-white backdrop-blur-sm shadow-sm"><span className="text-sm font-medium">Select a chat to start messaging</span></div>
        </div>
      )}
    </div>
  );
};