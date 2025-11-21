export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: 'sent' | 'read';
}

export interface Contact {
  id: string;
  name: string;
  avatar: string; // URL or 'saved-messages'
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  systemInstruction?: string; // Optional now
  phoneNumber?: string;
  isSavedMessages?: boolean; // New flag for self-chat
  isRealContact?: boolean; // Flag to check if it is a real Telegram user
}

export enum AppState {
  LOGIN = 'LOGIN',
  VERIFY = 'VERIFY',
  MESSENGER = 'MESSENGER',
}

export interface User {
  phoneNumber: string;
  firstName: string;
}