import React, { useState } from 'react';
import { Auth } from './components/Auth';
import { Messenger } from './components/Messenger';
import { AppState } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <div className="bg-gray-50 text-gray-900 font-sans antialiased">
      {appState !== AppState.MESSENGER ? (
        <Auth setAppState={setAppState} setPhoneNumber={setPhoneNumber} />
      ) : (
        <Messenger currentUserPhone={phoneNumber} />
      )}
    </div>
  );
}

export default App;