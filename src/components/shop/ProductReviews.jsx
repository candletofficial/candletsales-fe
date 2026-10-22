import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { reviewService } from '../../services/reviewService';
import { useAuth } from '../../hooks/useAuth';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Trải nghiệm tải thêm theo từng đợt (Load More theo bước 3 đánh giá)
  const INITIAL_COUNT = 3;
  const STEP_COUNT = 3;
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [selectedRating, setSelectedRating] = useState(0); // 0 = Tất cả

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
    setSelectedRating(0);
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewService.getReviewsByProduct(productId);
      if (res.success) {
        setReviews(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReviewClick = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
    } else {
      setShowModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !title || !content) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    try {
      setSubmitting(true);
      const res = await reviewService.createReview({
        productId,
        rating,
        title,
        content
      });
      if (res.success) {
        alert('Đánh giá thành công');
        setShowModal(false);
        setRating(5);
        setTitle('');
        setContent('');
        // Add new review to the list immediately
        setReviews([res.data, ...reviews]);
      }
    } catch (error) {
      console.error('Failed to create review', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate statistics
  const totalReviews = reviews.length;
  let avgRating = 5.0; // Default to 5.0 if no reviews
  let ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let recommendPercent = 100;

  if (totalReviews > 0) {
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    avgRating = (sum / totalReviews).toFixed(1);
    
    reviews.forEach(r => {
      if (ratingCounts[r.rating] !== undefined) {
        ratingCounts[r.rating]++;
      }
    });
    
    // Simple logic for recommend percent: % of 4 and 5 star reviews
    const positiveReviews = ratingCounts[5] + ratingCounts[4];
    recommendPercent = Math.round((positiveReviews / totalReviews) * 100);
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  };

  if (loading) {
    return (
      <div className="mt-0 flex justify-center border-t-8 border-stone-100 bg-white py-10 sm:mt-16 sm:border-t sm:border-stone-200 sm:bg-[#FFFDF9] sm:pb-8 sm:pt-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A2C2A]"></div>
      </div>
    );
  }

  return (
    <section className="relative mt-0 border-t-8 border-stone-100 bg-white pb-4 pt-8 sm:mt-16 sm:border-t sm:border-stone-200 sm:bg-[#FFFDF9] sm:pb-8 sm:pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Header */}
        <header className="mb-7 flex flex-col items-start justify-between gap-5 md:mb-10 md:flex-row md:items-end md:gap-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#B45309] uppercase mb-2 block">
              Trải Nghiệm Khách Hàng
            </span>
            <h2 className="text-3xl md:text-4xl font-serif-display text-[#4A2C2A]">
              Đánh Giá & Cảm Nhận Khứu Giác
            </h2>
          </div>
          <button 
            onClick={handleWriteReviewClick}
            className="bg-[#4A2C2A] sm:hover:bg-[#3A2221] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded flex items-center gap-2 transition-colors shrink-0 shadow-sm"
          >
            <i className="ph-bold ph-pencil-simple text-base"></i>
            Viết đánh giá của bạn
          </button>
        </header>

        {/* Summary Card */}
        <section className="mb-8 flex flex-col items-center gap-7 border-y border-stone-200 py-7 md:mb-10 md:flex-row md:gap-12 md:rounded-xl md:border md:border-stone-100 md:bg-white md:p-12 md:shadow-sm">
          
          {/* Left: Overall Rating */}
          <div className="flex flex-col items-center justify-center text-center w-full md:w-1/3 md:border-r border-stone-100 md:pr-12">
            <div className="text-6xl font-serif-display text-[#4A2C2A] mb-2">{avgRating}</div>
            <div className="flex gap-1 text-[#B45309] text-xl mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <i key={star} className={`${star <= Math.round(avgRating) ? 'ph-fill' : 'ph'} ph-star`}></i>
              ))}
            </div>
            <div className="text-sm text-stone-500 mb-4">
              Dựa trên {totalReviews} đánh giá đã xác thực đơn hàng
            </div>
            <div className="inline-flex items-center gap-2 bg-[#FFF9F2] text-[#B45309] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              {recommendPercent}% khách hàng sẽ mua lại
            </div>
          </div>

          {/* Right: Rating Bars */}
          <div className="w-full md:w-2/3 flex flex-col gap-3">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingCounts[star];
              const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-4 text-sm text-stone-600">
                  <div className="w-12 whitespace-nowrap">{star} Sao</div>
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#B45309] rounded-full" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="w-8 text-right text-stone-400">{count}</div>
                </div>
              );
            })}
          </div>

        </section>

        {/* Bộ lọc số sao (Filter Chips) */}
        {totalReviews > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-2 shrink-0">
              Lọc theo:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedRating(0);
                setVisibleCount(INITIAL_COUNT);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRating === 0
                  ? 'bg-[#4A2C2A] text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 sm:hover:border-stone-400'
              }`}
            >
              Tất cả ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingCounts[star] || 0;
              if (count === 0 && selectedRating !== star) return null;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setSelectedRating(selectedRating === star ? 0 : star);
                    setVisibleCount(INITIAL_COUNT);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedRating === star
                      ? 'bg-[#4A2C2A] text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-200 sm:hover:border-stone-400'
                  }`}
                >
                  <span>{star}</span>
                  <i className="ph-fill ph-star text-[#B45309]"></i>
                  <span className="opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Review Cards Grid */}
        {(() => {
          const filteredReviews = selectedRating > 0
            ? reviews.filter(r => r.rating === selectedRating)
            : reviews;
          const currentFilteredCount = filteredReviews.length;
          const visibleReviews = filteredReviews.slice(0, visibleCount);
          const remainingCount = currentFilteredCount - visibleReviews.length;
          const progressPercent = currentFilteredCount > 0
            ? Math.min(100, Math.round((visibleReviews.length / currentFilteredCount) * 100))
            : 100;

          if (currentFilteredCount === 0) {
            return (
              <div className="border-y border-stone-200 py-12 text-center md:rounded-xl md:border md:border-stone-100 md:bg-white">
                <p className="text-sm text-stone-500">Chưa có đánh giá {selectedRating} sao nào.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRating(0);
                    setVisibleCount(INITIAL_COUNT);
                  }}
                  className="mt-3 text-xs font-bold text-[#4A2C2A] sm:hover:underline cursor-pointer"
                >
                  Xem tất cả đánh giá
                </button>
              </div>
            );
          }

          return (
            <div>
              <div className="divide-y divide-stone-200 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0">
                {visibleReviews.map(review => (
                  <article key={review._id} className="animate-in fade-in flex flex-col py-6 transition-all duration-300 md:rounded-xl md:border md:border-stone-100 md:bg-white md:p-8 md:shadow-sm md:hover:shadow-md">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-0.5 text-[#B45309] text-sm">
                        {[...Array(review.rating)].map((_, i) => (
                          <i key={i} className="ph-fill ph-star"></i>
                        ))}
                      </div>
                      <span className="text-xs text-stone-400">{formatDate(review.createdAt)}</span>
                    </div>

                    <h4 className="text-lg font-serif-display text-[#4A2C2A] font-medium leading-snug mb-3">
                      {review.title}
                    </h4>
                    
                    <p className="text-sm text-stone-500 leading-relaxed italic mb-8 flex-1">
                      "{review.content}"
                    </p>

                    <div className="flex items-center gap-3 pt-6 border-t border-stone-100 mt-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FFF9F2] text-[#B45309] font-serif-display font-bold flex items-center justify-center shrink-0">
                        {getInitials(review.user?.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-stone-800 truncate">{review.user?.name || 'Người dùng'}</div>
                        {review.variant && <div className="text-xs text-stone-400 truncate">{review.variant}</div>}
                      </div>
                      {review.verified && (
                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-stone-500 shrink-0">
                          <i className="ph-bold ph-check text-green-600"></i>
                          Đã xác thực
                        </div>
                      )}
                    </div>
                    
                  </article>
                ))}
              </div>

              {/* Điều khiển Load More từng đợt & Thanh tiến độ */}
              {currentFilteredCount > INITIAL_COUNT && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  {/* Thanh tiến độ trực quan */}
                  <div className="text-center space-y-2">
                    <p className="text-xs font-medium text-stone-500">
                      Đang hiển thị <span className="font-bold text-[#4A2C2A]">{visibleReviews.length}</span> trên{' '}
                      <span className="font-bold text-[#4A2C2A]">{currentFilteredCount}</span> đánh giá
                    </p>
                    <div className="w-56 sm:w-72 h-1.5 bg-stone-200/80 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-gradient-to-r from-[#B45309] to-[#4A2C2A] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center gap-3 mt-1">
                    {remainingCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(prev => Math.min(currentFilteredCount, prev + STEP_COUNT))}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white border-2 border-[#4A2C2A] text-[#4A2C2A] sm:hover:bg-[#4A2C2A] sm:hover:text-white font-semibold text-sm tracking-wide transition-all duration-300 shadow-sm sm:hover:shadow-md active:scale-95 group cursor-pointer"
                      >
                        <span>Xem thêm ({Math.min(STEP_COUNT, remainingCount)} đánh giá tiếp)</span>
                        <i className="ph-bold ph-arrow-down text-base sm:group-hover:translate-y-0.5 transition-transform"></i>
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <span className="text-xs text-stone-600 bg-amber-50/80 border border-amber-200/70 px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xs">
                          <i className="ph-fill ph-check-circle text-emerald-600 text-sm"></i>
                          Bạn đã xem tất cả {currentFilteredCount} đánh giá
                        </span>
                        <button
                          type="button"
                          onClick={() => setVisibleCount(INITIAL_COUNT)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2C2A] sm:hover:underline px-3 py-1.5 cursor-pointer"
                        >
                          <i className="ph-bold ph-arrow-up text-xs"></i>
                          Thu gọn về {INITIAL_COUNT} đánh giá đầu
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        
      </div>

      {/* Write Review Modal / Bottom Sheet on mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Mobile drag handle indicator */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mb-4 sm:hidden"></div>
            
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 transition-colors cursor-pointer"
            >
              <i className="ph ph-x text-lg"></i>
            </button>
            <h3 className="text-xl sm:text-2xl font-serif-display text-[#4A2C2A] mb-5">Viết Đánh Giá Của Bạn</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Đánh giá số sao</label>
                <div className="flex gap-2.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-3xl focus:outline-none cursor-pointer active:scale-90 transition-transform"
                    >
                      <i className={`${star <= rating ? 'ph-fill text-[#B45309]' : 'ph text-stone-300'} ph-star`}></i>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Tiêu đề cảm nhận</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50"
                  placeholder="Ví dụ: Hương thơm gỗ thông ấm cúng..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Chi tiết trải nghiệm</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4A2C2A] min-h-[110px] bg-stone-50/50"
                  placeholder="Chia sẻ cảm nhận về độ tỏa hương, thời gian cháy, thẩm mỹ hũ nến..."
                  required
                ></textarea>
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#4A2C2A] sm:hover:bg-[#3A2221] active:bg-[#2A1817] text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submitting ? 'Đang gửi đánh giá...' : 'Gửi Đánh Giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
