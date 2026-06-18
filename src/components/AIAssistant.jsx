import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiService } from '../services/aiService';

// ─── Markdown-like renderer (light) ────────────────────────────
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code `text`
    .replace(/`(.*?)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>')
    // Bullet - item
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');
};

// ─── Sound Effects ──────────────────────────────────────────────
const sendAudio = new Audio('/sounds/send.mp3');
const receiveAudio = new Audio('/sounds/receive.mp3');

// Tải trước âm thanh để tránh bị trễ
sendAudio.load();
receiveAudio.load();

const playSendSound = () => {
  try {
    sendAudio.currentTime = 0;
    sendAudio.play().catch(() => {});
  } catch (e) {}
};

const playReceiveSound = () => {
  try {
    receiveAudio.currentTime = 0;
    receiveAudio.play().catch(() => {});
  } catch (e) {}
};

// ─── Message Bubble ─────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isLoading = msg.role === 'loading';

  if (isLoading) {
    return (
      <div className="flex gap-2 items-end">
        <div className="w-7 h-7 rounded-full bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-0.5">
          <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex gap-2 items-end justify-end">
        <div
          className="max-w-[80%] text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm text-[14px] leading-relaxed"
          style={{ background: 'linear-gradient(135deg, #1e40af, #1e3a8a)' }}
        >
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-gray-500 text-[14px]">person</span>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex gap-2 items-end">
      {/* Avatar AI — dùng logo Candlet */}
      <div className="w-7 h-7 rounded-full bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-0.5">
        <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
      </div>
      <div
        className="max-w-[85%] bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-[14px] text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
    </div>
  );
};

// ─── Main AIAssistant Component ─────────────────────────────────
export default function AIAssistant({ periodLabel = 'Tháng này' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load suggestions khi mở chat lần đầu
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      aiService.getSuggestions()
        .then((res) => setSuggestions(res.data.data || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Tự động focus vào ô nhập liệu khi mở chat hoặc khi AI trả lời xong
  useEffect(() => {
    if (isOpen && !loading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, loading]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Xin chào! Tôi là **AI Business Analyst** của Candlet Sales 🕯️\n\nTôi có thể giúp bạn phân tích dữ liệu kinh doanh, đưa ra nhận xét và gợi ý cải thiện dựa trên số liệu thực tế của cửa hàng.\n\nBạn muốn hỏi gì hôm nay?`,
        },
      ]);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');
    setHasError(false);

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'loading' },
    ]);
    setLoading(true);
    playSendSound();

    try {
      const res = await aiService.chat(userMsg, history, periodLabel);
      const aiMsg = res.data.data.message;

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        { role: 'assistant', content: aiMsg },
      ]);
      playReceiveSound();
    } catch (err) {
      const errStatus = err.response?.status;
      const apiMsg = err.response?.data?.message;
      let aiErrMsg = '';
      
      if (errStatus === 503 || errStatus === 429 || (apiMsg && apiMsg.includes('quá tải'))) {
        aiErrMsg = 'Mình đang phải phân tích một lượng lớn dữ liệu nên hơi quá tải một chút. Bạn vui lòng đợi vài phút rồi hỏi lại mình nhé! 🥺';
      } else {
        aiErrMsg = 'Xin lỗi bạn, hiện tại mình đang gặp một chút sự cố kỹ thuật. Bạn hãy thử lại sau nhé! 🛠️';
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        { role: 'assistant', content: aiErrMsg },
      ]);
      setHasError(true);
      playReceiveSound();
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, periodLabel]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([
        {
          role: 'assistant',
          content: `Cuộc trò chuyện đã được làm mới 🔄\n\nTôi vẫn sẵn sàng giúp bạn phân tích kinh doanh!`,
        },
      ]);
    }, 50);
  };

  return (
    <>
      {/* ── Floating Button ──────────────────────────────────── */}
      <button
        id="ai-assistant-toggle"
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-white overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(30,64,175,0.35), 0 0 0 3px #1e40af',
        }}
        title="AI Business Analyst"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-[#1e40af] text-[26px]">close</span>
        ) : (
          <>
            <img
              src="/logo.png"
              alt="Candlet AI"
              className="w-10 h-10 object-contain"
            />
            {/* Pulse ring */}
            <span
              className="absolute w-14 h-14 rounded-full animate-ping"
              style={{ background: 'rgba(30,64,175,0.2)' }}
            />
          </>
        )}
      </button>

      {/* ── Chat Panel ───────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ width: '460px' }}
      >
        <div
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            height: '680px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            background: '#f9fafb',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e40af, #1e3a8a)' }}
          >
            {/* Logo Candlet Shop */}
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
              <img
                src="/logo.png"
                alt="Candlet Shop"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[15px] leading-tight">AI Business Analyst</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-white/70 text-[11px]">Đang phân tích dữ liệu {periodLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Xóa lịch sử chat"
              >
                <span className="material-symbols-outlined text-white text-[15px]">refresh</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Đóng"
              >
                <span className="material-symbols-outlined text-white text-[15px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (chỉ hiển thị khi chưa chat nhiều) */}
          {messages.length <= 1 && suggestions.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gợi ý câu hỏi</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="text-[11.5px] font-medium px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50 leading-tight"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 bg-white border-t border-gray-100">
            <div className="flex gap-2 items-end bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                id="ai-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về dữ liệu kinh doanh..."
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-[14px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none leading-relaxed py-0.5 disabled:opacity-60"
                style={{ maxHeight: '80px', minHeight: '20px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                }}
              />
              <button
                id="ai-send-button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #1e40af, #1e3a8a)' : '#e5e7eb',
                }}
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ color: input.trim() ? 'white' : '#9ca3af' }}
                  >
                    send
                  </span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Dữ liệu thực tế · Powered by Gemini AI
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
