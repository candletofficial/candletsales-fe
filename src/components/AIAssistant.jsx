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
        <div className="w-7 h-7 rounded-full bg-white border border-primary-fixed flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-0.5">
          <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 bg-primary/65 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary/65 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary/65 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex gap-2 items-end justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-on-primary-container px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-sm">
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
      <div className="w-7 h-7 rounded-full bg-white border border-primary-fixed flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-0.5">
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
          content: `Xin chào! Tôi là **AI Business Analyst** của CandletShop 🕯️\n\nTôi có thể giúp bạn phân tích dữ liệu kinh doanh, đưa ra nhận xét và gợi ý cải thiện dựa trên số liệu thực tế của cửa hàng.\n\nBạn muốn hỏi gì hôm nay?`,
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
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-primary bg-white shadow-[0_10px_35px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition-all duration-300 hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6"
        title="AI Business Analyst"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-primary text-[26px]">close</span>
        ) : (
          <>
            <img
              src="/logo.png"
              alt="Candlet AI"
              className="w-10 h-10 object-contain"
            />
            {/* Pulse ring */}
            <span className="absolute h-14 w-14 animate-ping rounded-full bg-primary/20" />
          </>
        )}
      </button>

      {/* ── Chat Panel ───────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] transition-all duration-300 sm:right-6 sm:w-[460px] ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div
          className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low"
          style={{
            height: '680px',
            boxShadow: '0 20px 60px color-mix(in srgb, var(--color-primary) 18%, transparent)',
          }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center gap-3 bg-gradient-to-br from-primary to-on-primary-container px-4 py-3.5">
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
                    className="rounded-full border border-primary-fixed bg-primary-container px-2.5 py-1 text-[11.5px] font-medium leading-tight text-primary transition-colors hover:border-primary/30 hover:bg-primary-fixed disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 bg-white border-t border-gray-100">
            <div className="flex items-end gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
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
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${input.trim() && !loading ? 'bg-gradient-to-br from-primary to-on-primary-container text-white shadow-sm' : 'bg-surface-container text-on-surface-variant'}`}
              >
                {loading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">
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
