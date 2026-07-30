import { useState } from 'react';
import { ChatInput } from './components/ChatInput.jsx';
import { ChatMessages } from './components/ChatMessages.jsx';

import './App.css';

function App() {
  const [chatMessages, setChatMessages] = useState([
  {
    message: "Hello!",
    sender: "user",
    id: crypto.randomUUID(),
  },
  {
    message: "Hello! How can I help you today?",
    sender: "bot",
    id: crypto.randomUUID(),
  },
]);

  return (
    <div className="app-container">
      <ChatMessages chatMessages={chatMessages} />

      <ChatInput
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
      />
    </div>
  );
}

export default App;