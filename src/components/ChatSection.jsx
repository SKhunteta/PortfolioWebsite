import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaUser, FaMagic } from "react-icons/fa";
import { API_ENDPOINTS } from "../config/api.js";
import KaliAvatar from "../../images/Kaliavatar.png";

const ChatSection = () => {
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
    fetchSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.suggestions);
      const data = await response.json();

      const allSuggestions = [
        ...(data.general || []),
        ...(data.technical || []),
        ...(data.projects || []),
        ...(data.personal || []),
      ];

      setSuggestions(allSuggestions);
    } catch (error) {
      setSuggestions([
        "What are Shreyans' key technical skills?",
        "Tell me about his AI projects",
        "What's his educational background?",
        "What programming languages does he know?",
      ]);
    }
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

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
        body: JSON.stringify({ question: message.trim() }),
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
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.message || "Failed to get response");
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "ai",
        content:
          "I'm sorry, I encountered an error while processing your question. Please try again.",
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
    <div id="chat" className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">Ask Kali AI Assistant</h2>
        <p className="section-subtitle">
          Ask my cat Kali about anything regarding my work, projects and
          expertise. She's running on{" "}
          <a
            href="https://github.com/microsoft/NLWeb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Microsoft's NLWeb
          </a>{" "}
          framework and knows everything about my technical background.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-custom-lg overflow-hidden border-2 border-primary/10">
          {/* Enhanced Chat Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={KaliAvatar}
                  alt="Kali AI Assistant"
                  className="w-16 h-16 rounded-full object-cover border-4 border-white/40 shadow-lg"
                />
                <div>
                  <h3 className="text-xl font-bold">Kali AI Assistant</h3>
                  <p className="text-lg opacity-95">
                    Running on{" "}
                    <a
                      href="https://github.com/microsoft/NLWeb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:text-white/80 transition-colors"
                    >
                      Microsoft NLWeb
                    </a>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/20 rounded-full p-3">
                  <FaMagic className="text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="h-[28rem] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                      : "bg-white text-gray-800 shadow-lg border border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.type === "ai" && (
                      <div className="flex-shrink-0 mt-1">
                        <img
                          src={KaliAvatar}
                          alt="Kali"
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                        />
                      </div>
                    )}
                    {message.type === "user" && (
                      <div className="flex-shrink-0 mt-1">
                        <FaUser size={18} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-lg border border-gray-200 max-w-md lg:max-w-lg px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src={KaliAvatar}
                      alt="Kali thinking"
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
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
            <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
              <p className="text-sm text-gray-600 mb-4 font-medium">
                Try asking:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm text-gray-700 hover:text-primary border border-gray-200 hover:border-primary transform hover:scale-105"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t bg-white">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Shreyans' work, projects, or technical expertise..."
                className="flex-1 px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
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

export default ChatSection;
