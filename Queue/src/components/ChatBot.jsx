import { useState, useContext, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import "./ChatBot.css";

// Role-based suggestion buttons
const SUGGESTIONS = {
  customer: [
    "How do I join a queue?",
    "What's my queue position?",
    "How does the QR code work?",
    "What are priority levels?",
  ],
  owner: [
    "How do I create a shop?",
    "How to add a room?",
    "How to call next customer?",
    "What are room types?",
  ],
  guest: [
    "What is SmartQ?",
    "How does SmartQ work?",
    "How do I join a queue?",
    "How does the QR code work?",
  ],
};

export default function ChatBot() {
  const { user } = useContext(AuthContext);
  const { messages, addMessage, clearMessages, isOpen, toggleChat } = useContext(ChatContext);
  const location = useLocation();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Determine role for suggestions
  const userRole = user?.role === "owner" ? "owner" : user ? "customer" : "guest";
  const currentSuggestions = SUGGESTIONS[userRole];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const userMessage = text.trim();
    if (!userMessage || isStreaming) return;

    setError(null);
    addMessage("user", userMessage);
    setInput("");
    setIsStreaming(true);

    const allMessages = [...messages, { role: "user", content: userMessage }];
    const apiMessages = allMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const headers = { "Content-Type": "application/json" };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            currentPage: location.pathname,
            userName: user?.name || null,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6); // Remove "data: "
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistantMessage += parsed.content;
              setStreamingContent(assistantMessage);
            }
          } catch (parseErr) {
            // Skip malformed chunks
            if (parseErr.message !== "An error occurred") continue;
            throw parseErr;
          }
        }
      }

      if (assistantMessage) {
        addMessage("assistant", assistantMessage);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button className="chatbot-fab" onClick={toggleChat} title="SmartQ Assistant">
        {isOpen ? (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div>
              <div className="chatbot-header-title">SmartQ Assistant</div>
              <div className="chatbot-header-subtitle">
                {userRole === "owner" ? "Shop owner assistant" : userRole === "customer" ? "Queue assistant" : "Ask me anything about SmartQ"}
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-header-btn"
                onClick={clearMessages}
                title="Clear chat"
              >
                &#x1f5d1;
              </button>
              <button className="chatbot-header-btn" onClick={toggleChat} title="Close">
                &#x2715;
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 && !isStreaming && (
              <div className="chatbot-welcome">
                <div className="chatbot-welcome-icon">&#x1f916;</div>
                <h3>
                  {user ? `Hi ${user.name}!` : "Hi there!"}
                </h3>
                <p>
                  {userRole === "owner"
                    ? "I can help you manage your shops, rooms, queues, and more."
                    : userRole === "customer"
                      ? "I can help you join queues, check your position, find nearby shops, and more."
                      : "I can help you learn about SmartQ and how to get started. Ask me anything!"}
                </p>
                <div className="chatbot-suggestions">
                  {currentSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="chatbot-suggestion-btn"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-message chatbot-message-${msg.role}`}
              >
                {msg.content}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="chatbot-message chatbot-message-assistant">
                {streamingContent}
              </div>
            )}

            {/* Typing indicator */}
            {isStreaming && !streamingContent && (
              <div className="chatbot-typing">
                <div className="chatbot-typing-dot"></div>
                <div className="chatbot-typing-dot"></div>
                <div className="chatbot-typing-dot"></div>
              </div>
            )}

            {/* Error */}
            {error && <div className="chatbot-error">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage(input)}
              disabled={isStreaming || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
