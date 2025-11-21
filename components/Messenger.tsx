
import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message } from '../types';
import { getChatResponse } from '../services/geminiService';

interface MessengerProps {
  currentUserPhone: string;
  isRealMode: boolean;
}

const demoContacts: Contact[] = [
  {
    id: 'saved',
    name: 'Saved Messages',
    avatar: 'saved-messages', 
    lastMessage: '', // Start empty to show Cloud Storage view
    lastMessageTime: '',
    unreadCount: 0,
    isOnline: true, // Always "online"
    isSavedMessages: true,
    isRealContact: false
  },
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
  const [contacts, setContacts] = useState<Contact[]>(demoContacts);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Drawer State
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeContact = contacts.find(c => c.id === activeChatId);
  const currentInput = activeChatId ? (inputMap[activeChatId] || '') : '';

  // FETCH REAL CONTACTS
  useEffect(() => {
    if (isRealMode) {
        const fetchChats = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/get-dialogs');
                const data = await response.json();
                if (data.success) {
                    const realContacts: Contact[] = data.chats.map((c: any) => ({
                        id: c.id,
                        name: c.name || "Nomsiz foydalanuvchi",
                        avatar: `https://ui-avatars.com/api/?name=${c.name}&background=random`,
                        lastMessage: c.lastMessage || "",
                        lastMessageTime: new Date(c.date * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        unreadCount: c.unreadCount,
                        isOnline: false,
                        isRealContact: true,
                        isSavedMessages: false
                    }));
                    // Add Saved Messages and Bots to the list
                    setContacts([...demoContacts, ...realContacts]);
                }
            } catch (e) {
                console.error("Failed to fetch real chats", e);
            }
        };
        fetchChats();
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

    // Update Sidebar preview
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
            // Mark as sent/read locally
             setMessages(prev => {
                const chatMsgs = prev[activeChatId] || [];
                return {
                    ...prev,
                    [activeChatId]: chatMsgs.map(m => m.id === newMessage.id ? {...m, status: 'read'} : m)
                };
            });
        } catch (e) {
            console.error("Failed to send real message", e);
        }
        return; // STOP HERE, DO NOT CALL GEMINI
    }

    // 2. IF SAVED MESSAGES -> DO NOTHING (NO REPLY)
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

    // 3. IF AI BOT -> CALL GEMINI
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
        const active = updated.find(c => c.id === activeChatId);
        const others = updated.filter(c => c.id !== activeChatId);
        return active ? [active, ...others] : others;
    });
  };

  // --- Render Helpers ---

  const renderAvatar = (contact: Contact, size: string = "w-12 h-12") => {
    if (contact.isSavedMessages) {
      return (
        <div className={`${size} rounded-full bg-[#3390ec] flex items-center justify-center`}>
           <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
           </svg>
        </div>
      );
    }
    return <img src={contact.avatar} alt={contact.name} className={`${size} rounded-full object-cover bg-gray-200`} />;
  };

  // --- Icons ---
  const MenuIcon = () => (
    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
  const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
  const BackIcon = () => (
    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
  const AttachIcon = () => (
    <svg className="w-7 h-7 text-gray-400 hover:text-[#3390ec] transition" viewBox="0 0 24 24" fill="currentColor">
         <path d="M16.5 6C16.5 3.51472 14.4853 1.5 12 1.5C9.51472 1.5 7.5 3.51472 7.5 6V15.5C7.5 16.8807 8.61929 18 10 18C11.3807 18 12.5 16.8807 12.5 15.5V6.5C12.5 6.22386 12.2761 6 12 6C11.7239 6 11.5 6.22386 11.5 6.5V15.5C11.5 16.3284 10.8284 17 10 17C9.17157 17 8.5 16.3284 8.5 15.5V6C8.5 4.067 10.067 2.5 12 2.5C13.933 2.5 15.5 4.067 15.5 6V15.5C15.5 18.5376 13.0376 21 10 21C6.96243 21 4.5 18.5376 4.5 15.5V6.5C4.5 6.22386 4.27614 6 4 6C3.72386 6 3.5 6.22386 3.5 6.5V15.5C3.5 19.0899 6.41015 22 10 22C13.5899 22 16.5 19.0899 16.5 15.5V6Z" stroke="none"/>
    </svg>
  );
  const SmileIcon = () => (
    <svg className="w-7 h-7 text-gray-400 hover:text-[#3390ec] transition" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const MicIcon = () => (
    <svg className="w-7 h-7 text-gray-400 hover:text-[#3390ec] transition" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
  const SendIcon = () => (
    <svg className="w-8 h-8 text-[#3390ec] transform transition hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );

  // Drawer Item Component
  const DrawerItem = ({ icon, text, badge, onClick }: any) => (
    <div onClick={onClick} className="flex items-center px-6 py-3.5 hover:bg-gray-100 cursor-pointer transition-colors text-gray-700">
       <div className="w-6 h-6 mr-6 text-gray-500">
          {icon}
       </div>
       <span className="text-[15px] font-medium flex-1">{text}</span>
       {badge && <span className="text-blue-500 font-bold text-sm">{badge}</span>}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      
      {/* --- DRAWER MENU (SIDEBAR) --- */}
      {/* Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}
      
      {/* Drawer Panel */}
      <div className={`fixed inset-y-0 left-0 w-[300px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         {/* Drawer Header */}
         <div className="bg-[#3390ec] p-6 flex flex-col justify-end h-44">
            <div className="flex justify-between items-start mb-4">
               <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  {currentUserPhone.slice(-2) || "MG"}
               </div>
               <div className="bg-blue-800/30 p-1 rounded-full cursor-pointer hover:bg-blue-800/50 transition">
                  {/* Moon Icon */}
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               </div>
            </div>
            <div className="text-white">
               <h3 className="font-bold text-lg">Mushtum User</h3>
               <p className="text-blue-100 text-sm font-mono">{currentUserPhone || "+998 90 123 45 67"}</p>
            </div>
         </div>
         
         {/* Drawer List */}
         <div className="py-2 overflow-y-auto max-h-[calc(100vh-180px)]">
            <DrawerItem 
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              text="New Group"
            />
            <DrawerItem 
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              text="Contacts"
            />
            <DrawerItem 
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
              text="Calls"
            />
            <DrawerItem 
              onClick={() => {
                handleContactClick('saved');
                setIsDrawerOpen(false);
              }}
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
              text="Saved Messages"
              badge=""
            />
            <DrawerItem 
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              text="Settings"
            />
            
            <div className="border-t my-2"></div>
            
            <div className="px-6 py-3 text-xs text-gray-400">
              <p>Mushtumgram Lite v1.0.2</p>
              <p className="mt-1 text-green-600 flex items-center gap-1">
                 <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                 {isRealMode ? "REAL SERVER ONLINE" : "DEMO MODE"}
              </p>
            </div>
         </div>
      </div>

      {/* --- SIDEBAR LIST --- */}
      <div className={`${isMobileListOpen ? 'w-full md:w-[420px]' : 'hidden md:flex md:w-[420px]'} flex-col border-r border-gray-200 h-full bg-white z-20`}>
        
        {/* Sidebar Header */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
           <button onClick={() => setIsDrawerOpen(true)} className="p-1.5 rounded-full hover:bg-gray-100 transition">
              <MenuIcon />
           </button>
           <div className="relative flex-1">
              <input 
               type="text" 
               placeholder="Search" 
               className="w-full bg-[#f4f4f5] text-black rounded-full py-2 pl-10 pr-4 focus:bg-white focus:ring-2 focus:ring-[#3390ec] focus:outline-none transition border border-transparent focus:border-[#3390ec] text-[15px] placeholder-gray-500 h-10"
              />
              <div className="absolute left-3.5 top-2.5 pointer-events-none">
                <SearchIcon />
              </div>
           </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {contacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => handleContactClick(contact.id)}
              className={`flex items-center px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors duration-200 
                ${activeChatId === contact.id ? 'bg-[#3390ec] text-white' : 'hover:bg-[#f4f4f5]'}`}
            >
              <div className="relative flex-shrink-0">
                {renderAvatar(contact, "w-[54px] h-[54px]")}
                {contact.isOnline && !contact.isSavedMessages && (
                  <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-[2px] rounded-full ${activeChatId === contact.id ? 'bg-white border-[#3390ec]' : 'bg-[#00c73e] border-white'}`}></div>
                )}
              </div>
              <div className="ml-3 flex-1 overflow-hidden min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold truncate text-[16px] ${activeChatId === contact.id ? 'text-white' : 'text-black'}`}>
                    {contact.name}
                  </h3>
                  <span className={`text-[12px] flex-shrink-0 ${activeChatId === contact.id ? 'text-white/80' : 'text-gray-400'}`}>
                    {contact.lastMessageTime}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className={`text-[15px] truncate flex-1 mr-2 ${activeChatId === contact.id ? 'text-white/90' : 'text-gray-500'}`}>
                    {contact.isSavedMessages && !contact.lastMessage ? <span className="opacity-70">Saved Messages</span> : contact.lastMessage}
                  </p>
                  {contact.unreadCount > 0 && (
                    <span className={`text-[12px] font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full ${activeChatId === contact.id ? 'bg-white text-[#3390ec]' : 'bg-[#c4c9cc] text-white'}`}>
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- CHAT WINDOW --- */}
      {activeChatId && activeContact ? (
        <div className={`${!isMobileListOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full relative bg-[#87a7bf]`}>
           
           {/* Background Pattern */}
           <div className="absolute inset-0 tg-pattern opacity-60 pointer-events-none"></div>

          {/* Chat Header */}
          <div className="relative z-10 bg-white px-4 py-2 flex items-center justify-between shadow-sm cursor-pointer h-14 flex-shrink-0">
             <div className="flex items-center flex-1" onClick={() => {}}>
                <button onClick={handleBackToList} className="mr-3 md:hidden p-1 -ml-1 rounded-full hover:bg-gray-100">
                  <BackIcon />
                </button>
                {renderAvatar(activeContact, "w-9 h-9")}
                <div className="ml-3 flex flex-col justify-center">
                   <h2 className="font-bold text-black leading-tight text-[16px]">{activeContact.name}</h2>
                   {!activeContact.isSavedMessages && (
                     <p className="text-[13px] text-gray-500 leading-tight mt-0.5">
                        {isTyping ? <span className="text-[#3390ec]">yozmoqda...</span> : (activeContact.isOnline ? <span className="text-[#3390ec]">online</span> : 'last seen recently')}
                     </p>
                   )}
                </div>
             </div>
             <div className="flex items-center space-x-5 text-gray-400 pr-2">
                <button className="hover:text-gray-600 transition">
                   <SearchIcon />
                </button>
                <button className="hover:text-gray-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:px-16 lg:py-4 space-y-2 relative z-10 custom-scrollbar flex flex-col">
            
            {/* SAVED MESSAGES PLACEHOLDER */}
            {activeContact.isSavedMessages && (!messages[activeChatId] || messages[activeChatId].length === 0) ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center pb-20 animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-[#3390ec] rounded-full flex items-center justify-center shadow-lg mb-6">
                     <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                     </svg>
                  </div>
                  <h3 className="text-black font-semibold text-lg mb-4 shadow-sm bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm">Sizning bulutli xotirangiz</h3>
                  <div className="text-sm text-black/70 space-y-2.5 text-left bg-white/80 p-5 rounded-xl shadow-sm max-w-xs backdrop-blur-md">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#3390ec]"></div>
                         <span>Xabarlarni saqlash uchun shu yerga uzating</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#3390ec]"></div>
                         <span>Fayl va rasmlarni saqlash uchun yuboring</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#3390ec]"></div>
                         <span>Bu chatga istalgan qurilmadan kiring</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#3390ec]"></div>
                         <span>Qidiruv orqali eski xabarlarni toping</span>
                      </div>
                  </div>
               </div>
            ) : (
              <>
                {/* Date separator simulation */}
                <div className="flex justify-center sticky top-2 z-20 opacity-80 mb-4">
                   <span className="bg-[#00000060] text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">Bugun</span>
                </div>

                {messages[activeChatId]?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-1.5 group`}>
                     <div className={`max-w-[85%] lg:max-w-[560px] relative message-shadow px-3 py-[6px] text-[16px] leading-snug whitespace-pre-wrap break-words
                        ${msg.sender === 'me' 
                          ? 'bg-[#eeffde] text-black rounded-2xl rounded-tr-sm' 
                          : 'bg-white text-black rounded-2xl rounded-tl-sm'
                        }
                     `}>
                        {/* --- Tails --- */}
                        {msg.sender === 'me' ? (
                          <svg className="absolute -bottom-[0px] -right-[8px] w-[12px] h-[18px] text-[#eeffde] fill-current" viewBox="0 0 11 20">
                             <path d="M0 0v20h11c-6.5 0-11-4.5-11-11V0z" />
                          </svg>
                        ) : (
                          <svg className="absolute -bottom-[0px] -left-[8px] w-[12px] h-[18px] text-white fill-current scale-x-[-1]" viewBox="0 0 11 20">
                             <path d="M0 0v20h11c-6.5 0-11-4.5-11-11V0z" />
                          </svg>
                        )}

                        <span className="relative z-10">{msg.text}</span>
                        
                        {/* Metadata: Time & Ticks */}
                        <div className={`float-right flex items-end h-full ml-3 relative top-[6px]`}>
                           <span className={`text-[11px] ${msg.sender === 'me' ? 'text-[#4fae4e]' : 'text-[#a0acb6]'} select-none mr-1`}>
                             {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                           {msg.sender === 'me' && (
                              <div className="flex -space-x-1 items-end mb-[2px]">
                                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-[#4fae4e]`} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                 </svg>
                                 {msg.status === 'read' && (
                                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-[#4fae4e]`} viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                   </svg>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                   <div className="flex justify-start mb-2">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm relative ml-2">
                        <svg className="absolute -bottom-[0px] -left-[8px] w-[12px] h-[18px] text-white fill-current scale-x-[-1]" viewBox="0 0 11 20">
                           <path d="M0 0v20h11c-6.5 0-11-4.5-11-11V0z" />
                        </svg>
                        <div className="flex space-x-1.5 items-center h-3">
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-[bounce_0.8s_infinite_0ms]"></div>
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-[bounce_0.8s_infinite_200ms]"></div>
                          <div className="w-1.5 h-1.5 bg-[#3390ec] rounded-full animate-[bounce_0.8s_infinite_400ms]"></div>
                        </div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="relative z-20 bg-white px-3 py-2 md:px-4 flex-shrink-0">
             <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-[700px] mx-2">
               
               <button type="button" className="p-2 text-gray-400 hover:text-[#3390ec] transition rounded-full hover:bg-gray-50 self-center" title="Attach">
                  <AttachIcon />
               </button>
               
               <div className="flex-1 bg-white flex items-center py-2 relative">
                 <input 
                  ref={inputRef}
                  type="text" 
                  value={currentInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Xabar..." 
                  className="w-full bg-transparent border-none outline-none text-black placeholder-gray-400 text-[16px]"
                 />
                 <button type="button" className="absolute right-0 p-1 text-gray-400 hover:text-[#3390ec] transition">
                    <SmileIcon />
                 </button>
               </div>

               {currentInput.trim().length > 0 ? (
                 <button type="submit" className="p-2 rounded-full hover:bg-blue-50 transition self-center">
                   <SendIcon />
                 </button>
               ) : (
                 <button type="button" className="p-2 rounded-full hover:bg-gray-50 transition self-center">
                   <MicIcon />
                 </button>
               )}
             </form>
          </div>
        </div>
      ) : (
        // Empty State (No chat selected)
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#87a7bf] relative">
             <div className="absolute inset-0 tg-pattern opacity-60 pointer-events-none"></div>
             <div className="z-10 bg-[#212121]/40 px-4 py-1.5 rounded-full text-white backdrop-blur-sm shadow-sm">
                <span className="text-sm font-medium">Select a chat to start messaging</span>
             </div>
        </div>
      )}
    </div>
  );
};