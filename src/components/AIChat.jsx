import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaUser, FaMagic } from "react-icons/fa";
import { API_ENDPOINTS } from "../config/api.js";
import KaliAvatar from "../../images/Kaliavatar.png";

const MAX_EXCHANGES = 5;

/**
 * Convert the frontend messages array into the backend's expected format.
 * Excludes the initial greeting (id === 1) and maps type to role.
 */
function buildConversationHistory(messages) {
  const maxMessages = MAX_EXCHANGES * 2;

  const history = messages
    .filter((msg) => msg.id !== 1)
    .map((msg) => ({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content,
    }));

  if (history.length > maxMessages) {
    return history.slice(history.length - maxMessages);
  }

  return history;
}

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm Kali, and I help answer questions about Shreyans' work and background. I have a unique perspective on his projects and skills - ask me anything about his experience, technical expertise, or creative work!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Fetch suggestions on component mount
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.suggestions);
      const data = await response.json();

      // Combine suggestions from different categories
      const allSuggestions = [
        ...(data.general || []),
        ...(data.technical || []),
        ...(data.projects || []),
        ...(data.personal || []),
      ];

      setSuggestions(allSuggestions);
    } catch (error) {
      // Set default suggestions if API fails
      setSuggestions([
        "What are Shreyans' key technical skills?",
        "Tell me about his AI projects",
        "What's his educational background?",
        "What programming languages does he know?",
      ]);
    }
  };

  // Count user exchanges (excluding the initial AI greeting)
  const exchangeCount = messages.filter(
    (msg) => msg.type === "user" && msg.id !== 1
  ).length;
  const chatLimitReached = exchangeCount >= MAX_EXCHANGES;

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || chatLimitReached) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setInputMessage("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch(API_ENDPOINTS.ask, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: message.trim(),
          conversation_history: buildConversationHistory(messages),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage = {
          id: Date.now() + 1,
          type: "ai",
          content: data.answer,
          sources: data.sources,
          responseTime: data.responseTime,
          timestamp: new Date(),
        };

        // Check if this was the last allowed exchange
        const newExchangeCount = exchangeCount + 1;
        if (newExchangeCount >= MAX_EXCHANGES) {
          const signOffMessage = {
            id: Date.now() + 2,
            type: "ai",
            content:
              "That's all the questions I'll take for now — a queen needs her rest. If you want to keep chatting, refresh the page... or better yet, reach out to my human directly!",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage, signOffMessage]);
        } else {
          setMessages((prev) => [...prev, aiMessage]);
        }
      } else {
        throw new Error(data.message || "Failed to get response");
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "ai",
        content:
          "Oops! It looks like too many users made too many requests this month. My human Shreyans doesn't have the budget for that! If you'd like him to have the update, you can send him some money at his Venmo @Shreyans-Khunteta or his PayPal paypal.me/SKhunteta",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">AI Assistant</h2>
        <p className="section-subtitle">
          Ask me anything about Shreyans' background, projects, or expertise
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-custom-lg overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-4 text-white">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <img
                  src={KaliAvatar}
                  alt="Kali AI Assistant"
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold">Kali AI Assistant</h3>
                <p className="text-sm opacity-90">
                  <a
                    href="https://github.com/microsoft/NLWeb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/80 transition-colors underline"
                  >
                    Running on NLWeb!
                  </a>
                </p>
              </div>
              <div className="ml-auto">
                <FaMagic className="text-white/70" />
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === "user"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-800 shadow-md border"
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === "ai" && (
                      <div className="flex-shrink-0 mt-1">
                        <img
                          src={KaliAvatar}
                          alt="Kali"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      </div>
                    )}
                    {message.type === "user" && (
                      <div className="flex-shrink-0 mt-1">
                        <FaUser size={16} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {/* {message.responseTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          Response time: {message.responseTime}
                        </p>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-md border max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <img
                      src={KaliAvatar}
                      alt="Kali thinking"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">Try asking:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm text-gray-700 hover:text-primary border hover:border-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  chatLimitReached
                    ? "Chat limit reached — refresh to start a new conversation"
                    : "Ask me anything about Shreyans' work or experience..."
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading || chatLimitReached}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || chatLimitReached}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
