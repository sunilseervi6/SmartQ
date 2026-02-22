import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <ChatContext.Provider
      value={{ messages, setMessages, addMessage, clearMessages, isOpen, setIsOpen, toggleChat }}
    >
      {children}
    </ChatContext.Provider>
  );
};
