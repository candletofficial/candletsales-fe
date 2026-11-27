import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';

const STORAGE_MESSAGES_KEY = 'candlet_ai_analyst_messages_v2';
const STORAGE_OPEN_KEY = 'candlet_ai_analyst_open_v2';

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'this_week', label: 'Tuần này' },
  { id: 'this_month', label: 'Tháng này' },
  { id: 'last_month', label: 'Tháng trước' },
  { id: 'this_year', label: 'Năm nay' },
];

const PAGE_LABELS = {
  '/admin/dashboard': 'Tổng quan hệ thống',
  '/admin/orders': 'Quản lý đơn hàng',
  '/admin/pos': 'Bán hàng tại quầy (POS)',
  '/admin/products': 'Quản lý sản phẩm & Công thức',
  '/admin/custom-products': 'Quản lý sản phẩm Custom',
  '/admin/materials': 'Kho nguyên vật liệu',
  '/admin/essential-oils': 'Quản lý tinh dầu',
  '/admin/imports': 'Quản lý nhập kho',
  '/admin/inventory-checks': 'Kiểm kê kho hàng',
  '/admin/ad-costs': 'Chi phí quảng cáo & Affiliate',
  '/admin/fund': 'Quản lý quỹ & Tài sản',
  '/admin/expenses': 'Quản lý phiếu chi',
  '/admin/coupons': 'Mã giảm giá',
  '/admin/tools/shopee': 'Công cụ tính giá Shopee',
  '/admin/tools/tiktok': 'Công cụ tính giá TikTok',
  '/admin/posts': 'Quản lý bài viết',
  '/admin/custom-page': 'Quản lý trang Custom',
  '/admin/messenger-bot': 'Cấu hình Messenger Bot',
  '/admin/users': 'Quản lý tài khoản',
  '/admin/settings': 'Cài đặt hệ thống',
};

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Xin chào! Tôi là **AI Business Analyst** của CandletShop 🕯️\n\nTôi đã được đồng bộ dữ liệu thực tế toàn hệ thống (Doanh thu, Đơn hàng, Giá vốn, Quảng cáo, Quỹ tiền mặt, Công nợ và Tồn kho nguyên vật liệu) và luôn đồng hành cùng bạn ngay cả khi chuyển trang.\n\nBạn muốn phân tích số liệu nào hôm nay?`,
};

// ─── Markdown renderer ──────────────────────────────────────────
const escapeHtml = (raw) =>
  String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatInline = (line) =>
  line
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#f3f4f6;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.88em">$1</code>'
    );

const renderMarkdown = (text) => {
  if (!text) return '';
  const lines = escapeHtml(text).split('\n');
  const htmlParts = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      htmlParts.push('<div class="h-2"></div>');
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      closeList();
      const title = formatInline(line.replace(/^#{1,3}\s+/, ''));
      htmlParts.push(`<div class="font-bold text-gray-900 mt-2.5 mb-1 text-[14px]">${title}</div>`);
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-4 space-y-1 my-1">');
        inList = true;
      }
      htmlParts.push(`<li>${formatInline(line.replace(/^[-•*]\s+/, ''))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      closeList();
      htmlParts.push(`<div class="my-1">${formatInline(line)}</div>`);
      continue;
    }

    closeList();
    htmlParts.push(`<div class="my-0.5">${formatInline(line)}</div>`);
  }

  closeList();
  return htmlParts.join('');
};

// ─── Sound Effects ──────────────────────────────────────────────
const sendAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/send.mp3') : null;
const receiveAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/receive.mp3') : null;

try {
  sendAudio?.load();
  receiveAudio?.load();
} catch (e) {}

const playSendSound = () => {
  try {
    if (!sendAudio) return;
    sendAudio.currentTime = 0;
    sendAudio.play().catch(() => {});
  } catch (e) {}
};

const playReceiveSound = () => {
  try {
    if (!receiveAudio) return;
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
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-on-primary-container px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-sm whitespace-pre-wrap">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-gray-500 text-[14px]">person</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="w-7 h-7 rounded-full bg-white border border-primary-fixed flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-0.5">
        <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
      </div>
      <div
        className="max-w-[86%] bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-[13.5px] text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
    </div>
  );
};

// ─── Main AIAssistant Component ─────────────────────────────────
export default function AIAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminRoute = location.pathname.startsWith('/admin')
    && location.pathname !== '/admin/login'
    && location.pathname !== '/admin/register';
  const isVisible = isAdminRoute && Boolean(user) && user.role === 'admin';

  const [isOpen, setIsOpen] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((m) => m.role !== 'loading');
        }
      }
    } catch {}
    return [WELCOME_MESSAGE];
  });

  const [periodState, setPeriodState] = useState({
    filterType: 'this_month',
    periodLabel: 'Tháng này',
    days: undefined,
    endDate: undefined,
  });

  const [aiEngine, setAiEngine] = useState({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentPageLabel = PAGE_LABELS[location.pathname] || location.pathname;

  // Lưu trạng thái mở và lịch sử tin nhắn vào sessionStorage để giữ nguyên khi chuyển trang hoặc F5
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_OPEN_KEY, String(isOpen));
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    try {
      const cleanMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
      if (cleanMessages.length > 0) {
        sessionStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(cleanMessages));
      }
    } catch {}
  }, [messages]);

  // Lắng nghe sự kiện đồng bộ bộ lọc kỳ báo cáo từ trang Dashboard
  useEffect(() => {
    const handlePeriodSync = (event) => {
      const detail = event.detail;
      if (!detail) return;
      setPeriodState((prev) => ({
        ...prev,
        filterType: detail.filterType || prev.filterType,
        periodLabel: detail.periodLabel || prev.periodLabel,
        days: detail.days,
        endDate: detail.endDate,
      }));
    };

    const handleConfigUpdated = (event) => {
      const detail = event.detail;
      if (detail?.activeProvider) {
        setAiEngine({
          provider: detail.activeProvider,
          model: detail.activeModel || (detail.activeProvider === 'openai' ? 'gpt-5.4' : 'gemini-2.5-flash'),
        });
      } else {
        aiService.getConfig()
          .then((res) => {
            const d = res.data?.data;
            if (d?.activeProvider) {
              setAiEngine({ provider: d.activeProvider, model: d.activeModel });
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener('candlet:ai-period-sync', handlePeriodSync);
    window.addEventListener('candlet:ai-config-updated', handleConfigUpdated);
    return () => {
      window.removeEventListener('candlet:ai-period-sync', handlePeriodSync);
      window.removeEventListener('candlet:ai-config-updated', handleConfigUpdated);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Load suggestions & active AI provider info
  useEffect(() => {
    if (isVisible && isOpen) {
      if (suggestions.length === 0) {
        aiService.getSuggestions()
          .then((res) => {
            setSuggestions(res.data?.data || []);
            if (res.data?.meta?.provider) {
              setAiEngine({
                provider: res.data.meta.provider,
                model: res.data.meta.model,
              });
            }
          })
          .catch(() => {});
      } else {
        aiService.getConfig()
          .then((res) => {
            const d = res.data?.data;
            if (d?.activeProvider) {
              setAiEngine({ provider: d.activeProvider, model: d.activeModel });
            }
          })
          .catch(() => {});
      }
    }
  }, [isVisible, isOpen, suggestions.length]);

  useEffect(() => {
    if (isOpen && !loading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, loading]);

  const handleSelectPeriod = (nextFilterType) => {
    const found = PERIOD_OPTIONS.find((p) => p.id === nextFilterType);
    if (!found) return;
    setPeriodState({
      filterType: found.id,
      periodLabel: found.label,
      days: undefined,
      endDate: undefined,
    });
  };

  const sendMessage = useCallback(async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');

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
      const res = await aiService.chat(userMsg, history, periodState.periodLabel, {
        filterType: periodState.filterType,
        days: periodState.days,
        endDate: periodState.endDate,
        currentPage: currentPageLabel,
      });
      const data = res.data?.data || {};
      const aiMsg = data.message;

      if (data.provider) {
        setAiEngine({
          provider: data.provider,
          model: data.model || aiEngine.model,
        });
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        { role: 'assistant', content: aiMsg },
      ]);
      playReceiveSound();
    } catch (err) {
      const errStatus = err.response?.status;
      const apiMsg = err.response?.data?.message;
      let aiErrMsg = '';

      if (apiMsg && (errStatus === 401 || errStatus === 403 || errStatus === 503)) {
        aiErrMsg = apiMsg;
      } else if (errStatus === 503 || errStatus === 429 || (apiMsg && apiMsg.includes('quá tải'))) {
        aiErrMsg = 'Hệ thống AI đang xử lý lượng lớn yêu cầu hoặc hết hạn mức quota. Bạn vui lòng kiểm tra lại API Key trong Cài đặt hoặc thử lại sau ít phút nhé! 🥺';
      } else {
        aiErrMsg = apiMsg || 'Xin lỗi bạn, hiện tại mình đang gặp sự cố kết nối. Bạn hãy kiểm tra cấu hình API Key trong phần Cài đặt rồi thử lại nhé! 🛠️';
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        { role: 'assistant', content: aiErrMsg },
      ]);
      playReceiveSound();
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, periodState, currentPageLabel, aiEngine.model]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClear = () => {
    const resetMsg = {
      role: 'assistant',
      content: `Cuộc trò chuyện đã được làm mới 🔄\n\nDữ liệu kỳ **${periodState.periodLabel}** luôn được đồng bộ thời gian thực. Bạn muốn phân tích nội dung nào tiếp theo?`,
    };
    setMessages([resetMsg]);
    try {
      sessionStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify([resetMsg]));
    } catch {}
  };

  const handleOpenSettings = () => {
    navigate('/admin/settings?tab=automation');
  };

  if (!isVisible) return null;

  const providerBadgeText = aiEngine.provider === 'openai'
    ? `OpenAI (${aiEngine.model || 'gpt-5.4'})`
    : 'Gemini AI';

  return (
    <div className="admin-theme-scope">
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
            {loading ? (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            ) : (
              <span className="absolute h-14 w-14 animate-ping rounded-full bg-primary/20" />
            )}
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
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
              <img
                src="/logo.png"
                alt="Candlet Shop"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-[15px] leading-tight truncate">AI Business Analyst</p>
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/95 border border-white/15">
                  {aiEngine.provider === 'openai' ? (aiEngine.model || 'GPT-5.4').toUpperCase() : 'GEMINI'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-white/75 text-[11px] shrink-0">Kỳ dữ liệu:</span>
                <select
                  value={PERIOD_OPTIONS.some((p) => p.id === periodState.filterType) ? periodState.filterType : 'custom'}
                  onChange={(e) => handleSelectPeriod(e.target.value)}
                  className="bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold rounded-md px-1.5 py-0.5 border border-white/20 focus:outline-none cursor-pointer"
                  title="Chọn kỳ phân tích dữ liệu"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="text-gray-900 bg-white">
                      {opt.label}
                    </option>
                  ))}
                  {!PERIOD_OPTIONS.some((p) => p.id === periodState.filterType) && (
                    <option value="custom" className="text-gray-900 bg-white">
                      {periodState.periodLabel}
                    </option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenSettings}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Cấu hình API Key GPT trong Cài đặt"
              >
                <span className="material-symbols-outlined text-white text-[15px]">settings</span>
              </button>
              <button
                onClick={handleClear}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Làm mới lịch sử chat"
              >
                <span className="material-symbols-outlined text-white text-[15px]">refresh</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Thu gọn (vẫn giữ cuộc trò chuyện khi chuyển trang)"
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

          {/* Suggested Questions */}
          {messages.length <= 1 && suggestions.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gợi ý câu hỏi</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="rounded-full border border-primary-fixed bg-primary-container px-2.5 py-1 text-[11.5px] font-medium leading-tight text-primary transition-colors hover:border-primary/30 hover:bg-primary-fixed disabled:opacity-50 text-left"
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
                placeholder="Hỏi về doanh thu, lợi nhuận, tồn kho, quỹ..."
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
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  input.trim() && !loading
                    ? 'bg-gradient-to-br from-primary to-on-primary-container text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {loading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">send</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Dữ liệu thực tế đồng bộ · Powered by {providerBadgeText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
