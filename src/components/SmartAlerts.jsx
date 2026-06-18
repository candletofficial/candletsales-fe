import React, { useEffect, useState } from 'react';
import { aiService } from '../services/aiService';

const getAlertConfig = (type) => {
  switch (type) {
    case 'danger':
      return {
        icon: 'warning',
        iconColor: 'text-red-500',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
      };
    case 'warning':
      return {
        icon: 'error_outline',
        iconColor: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
      };
    case 'success':
      return {
        icon: 'check_circle',
        iconColor: 'text-emerald-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
      };
    default:
      return {
        icon: 'lightbulb',
        iconColor: 'text-blue-500',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
      };
  }
};

const alertAudio = new Audio('/sounds/alert.mp3');
alertAudio.load();

const playNotificationSound = () => {
  try {
    alertAudio.currentTime = 0;
    alertAudio.play().catch((e) => {
      // Trình duyệt có thể chặn autoplay nếu user chưa click vào trang, có thể bỏ qua
      console.warn("Could not play notification sound:", e);
    });
  } catch (e) {}
};

let globalFetchPromise = null;

export default function SmartAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    // Lưu trạng thái đã xem vào session storage
    sessionStorage.setItem('smartAlertsShown', 'true');
  };

  useEffect(() => {
    let isMounted = true;
    
    // Nếu người dùng đã đóng modal trong phiên làm việc này, không hiện nữa
    if (sessionStorage.getItem('smartAlertsShown') === 'true') {
      setIsOpen(false);
      setLoading(false);
      return;
    }

    // Kiểm tra xem đã fetch dữ liệu thành công trước đó chưa
    const cachedData = sessionStorage.getItem('smartAlertsData');
    if (cachedData) {
      try {
        setAlerts(JSON.parse(cachedData));
        setLoading(false);
        return;
      } catch (e) {
        // Lỗi parse thì bỏ qua
      }
    }

    setLoading(true);

    // Sử dụng Global Promise để nếu user có chuyển trang khi đang fetch thì cũng không bị gọi lại 2 lần API
    if (!globalFetchPromise) {
      globalFetchPromise = aiService.getSmartAlerts()
        .then((res) => {
          const fetchedAlerts = res.data.data || [];
          if (fetchedAlerts.length > 0) {
            sessionStorage.setItem('smartAlertsData', JSON.stringify(fetchedAlerts));
          }
          return { data: fetchedAlerts, error: null };
        })
        .catch((err) => {
          console.error('Failed to load smart alerts:', err);
          return { data: [], error: 'Không thể tải AI Cảnh Báo' };
        });
    }

    globalFetchPromise.then(({ data, error: fetchError }) => {
      if (isMounted) {
        setAlerts(data);
        setError(fetchError);
        setLoading(false);
        // Phát âm thanh nếu có thông báo và không có lỗi
        if (data && data.length > 0 && !fetchError) {
          playNotificationSound();
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []); // Reload once on mount

  // Không hiển thị nếu đang loading, có lỗi, mảng rỗng, hoặc user đã đóng
  if (loading || error || alerts.length === 0 || !isOpen) {
    return null; 
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            <h3 className="text-[16px] font-bold tracking-wide">AI Phân tích & Cảnh báo</h3>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Đóng"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6">
          <p className="text-gray-600 text-[14px] mb-5">
            Dựa trên dữ liệu kinh doanh gần nhất, AI của hệ thống Candlet Sales xin gửi đến bạn những lưu ý sau:
          </p>
          
          <div className="relative flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {alerts.map((alert, index) => {
              const config = getAlertConfig(alert.type);
              const isLast = index === alerts.length - 1;
              return (
                <div
                  key={index}
                  className={`relative pl-10 py-5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors ${index === 0 ? 'pt-2' : ''} ${isLast ? 'pb-2' : ''}`}
                >
                  {/* Timeline connector */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-[40px] bottom-[-20px] w-[2px] bg-gray-100"></div>
                  )}

                  {/* Icon */}
                  <div className={`absolute left-0 ${index === 0 ? 'top-2' : 'top-5'} w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.border} border shadow-sm z-10`}>
                    <span className={`material-symbols-outlined ${config.iconColor} text-[16px]`}>
                      {config.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className="text-[15px] font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                      {alert.title}
                      {alert.type === 'danger' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] uppercase font-black tracking-wider">Cần xử lý</span>
                      )}
                    </h4>
                    <p className="text-[14px] text-gray-600 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Modal Footer */}
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors text-[14px]"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
