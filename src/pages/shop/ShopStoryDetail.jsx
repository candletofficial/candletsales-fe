import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postService } from '../../services/postService';

export default function ShopStoryDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reading progress state
  const [scrollProgress, setScrollProgress] = useState(0);

  // Interactive reading tools
  const [fontSize, setFontSize] = useState('normal'); // 'normal' | 'large' | 'xlarge'
  const [likesCount, setLikesCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (slug) {
      // Kiểm tra trạng thái đã like trong localStorage
      try {
        const likedStories = JSON.parse(localStorage.getItem('candlet_liked_stories') || '[]');
        setIsLiked(likedStories.includes(slug));
      } catch (e) {
        setIsLiked(false);
      }

      fetchPostDetail();
      window.scrollTo(0, 0);
    }
  }, [slug]);

  // Handle scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const scroll = (totalScroll / windowHeight) * 100;
        setScrollProgress(scroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPostDetail = async () => {
    try {
      setLoading(true);
      const res = await postService.getPostBySlug(slug);
      if (res.data?.success) {
        const postData = res.data.data.post;
        setPost(postData);
        setRelatedPosts(res.data.data.relatedPosts || []);
        setLikesCount(postData.likesCount || 0);
        setViewCount(postData.viewCount || 0);
        if (postData.title) {
          document.title = `${postData.title} | Candlet Stories`;
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết câu chuyện:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    const action = nextLiked ? 'like' : 'unlike';

    // Cập nhật Optimistic UI
    setIsLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, nextLiked ? prev + 1 : prev - 1));

    // Cập nhật localStorage
    try {
      let likedStories = JSON.parse(localStorage.getItem('candlet_liked_stories') || '[]');
      if (nextLiked) {
        if (!likedStories.includes(slug)) likedStories.push(slug);
      } else {
        likedStories = likedStories.filter((s) => s !== slug);
      }
      localStorage.setItem('candlet_liked_stories', JSON.stringify(likedStories));
    } catch (e) {
      console.error('Lỗi lưu trạng thái thích:', e);
    }

    // Gửi yêu cầu lưu vào Database MongoDB
    try {
      const res = await postService.toggleLike(slug, action);
      if (res.data?.success && res.data.data?.likesCount !== undefined) {
        setLikesCount(res.data.data.likesCount);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật lượt tim:', error);
      // Revert lại nếu API thất bại
      setIsLiked(!nextLiked);
      setLikesCount((prev) => Math.max(0, nextLiked ? prev - 1 : prev + 1));
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-36 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#4A2C2A]/20 border-t-[#4A2C2A] animate-spin"></div>
        <p className="font-serif-display italic text-base text-stone-600">Đang mở trang sách bên ánh lửa...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-36 text-center px-4">
        <div className="max-w-md mx-auto bg-white p-10 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <i className="ph-thin ph-article-medium text-5xl text-amber-800/60"></i>
          <h2 className="font-serif-display text-3xl font-bold text-[#381B18]">Không Tìm Thấy Câu Chuyện</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Câu chuyện này có thể đã chuyển sang một tập sách khác hoặc tạm thời được lưu trữ tại xưởng.
          </p>
          <Link
            to="/stories"
            className="inline-flex items-center gap-2 bg-[#381B18] text-amber-100 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#25110F] transition-all shadow-xs mt-2"
          >
            <i className="ph-bold ph-arrow-left"></i>
            <span>Về Danh Sách Câu Chuyện</span>
          </Link>
        </div>
      </div>
    );
  }

  const themeColor = post.customDesign?.themeColor || '#4A2C2A';
  const isSerif = post.customDesign?.fontStyle !== 'sans';

  // Dynamic font size classes for comfortable reading
  const fontSizeClasses = {
    normal: 'text-base sm:text-[17px] leading-[1.85]',
    large: 'text-lg sm:text-[19px] leading-[1.95]',
    xlarge: 'text-xl sm:text-[21px] leading-[2.05]',
  }[fontSize];

  return (
    <div className="bg-[#FAF7F2] text-[#2C1810] min-h-screen pb-32 font-jakarta selection:bg-[#4A2C2A] selection:text-white relative">
      
      {/* 1. READING PROGRESS BAR (Thanh tiến trình cuộn) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-stone-200/50">
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{
            width: `${scrollProgress}%`,
            backgroundColor: themeColor,
          }}
        />
      </div>

      {/* 2. ARTICLE HEADER (Editorial Spread) */}
      <header className="pt-12 sm:pt-16 pb-10 max-w-4xl mx-auto px-4 sm:px-8 text-center relative">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500 mb-6">
          <Link to="/" className="hover:text-[#4A2C2A] transition-colors">Trang Chủ</Link>
          <span className="text-stone-300">/</span>
          <Link to="/stories" className="hover:text-[#4A2C2A] transition-colors">Câu Chuyện</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-400 truncate max-w-[180px] sm:max-w-none">{post.category}</span>
        </div>

        {/* Category Pill with Glowing Dot */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wider shadow-xs" style={{ backgroundColor: themeColor }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse"></span>
            <span>{post.category}</span>
          </div>

          {post.customDesign?.ambientMood && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-950 text-xs font-medium backdrop-blur-xs">
              <i className="ph-fill ph-headphones text-amber-800 text-sm"></i>
              <span>Âm hưởng: <strong>{post.customDesign.ambientMood}</strong></span>
            </div>
          )}
        </div>

        {/* Article Headline */}
        <h1
          className={`text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] mb-6 text-[#25120F] tracking-tight ${
            isSerif ? 'font-serif-display' : 'font-jakarta'
          }`}
        >
          {post.title}
        </h1>

        {/* Summary Lead Block */}
        <div className="max-w-2xl mx-auto my-8 p-6 rounded-2xl bg-white/70 border border-stone-200/80 shadow-2xs backdrop-blur-xs">
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed font-serif-display italic">
            "{post.summary}"
          </p>
        </div>

        {/* Meta info & Interactive Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-4 border-t border-b border-stone-200/80 text-xs text-stone-500">
          
          {/* Author info */}
          <div className="flex items-center gap-3 text-left">
            <div
              className="w-11 h-11 rounded-full text-white flex items-center justify-center font-serif-display font-bold text-base shadow-xs"
              style={{ backgroundColor: themeColor }}
            >
              {post.author ? post.author.charAt(0) : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-800 text-sm">{post.author}</span>
                <i className="ph-fill ph-seal-check text-amber-700 text-sm" title="Tác giả xưởng Candlet"></i>
              </div>
              <span className="text-[11px] text-stone-400">
                {new Date(post.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })} • {post.readTime} • {viewCount || 0} lượt đọc
              </span>
            </div>
          </div>

          {/* Reading tools (Like, Font Size, Share) */}
          <div className="flex items-center gap-2">
            
            {/* Font Size Adjuster */}
            <div className="flex items-center bg-white border border-stone-200/90 rounded-full px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${
                  fontSize === 'normal' ? 'bg-[#381B18] text-white' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Cỡ chữ tiêu chuẩn"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 text-sm font-bold rounded-full transition-colors ${
                  fontSize === 'large' ? 'bg-[#381B18] text-white' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Cỡ chữ lớn"
              >
                A+
              </button>
            </div>

            {/* Like Button */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all text-xs font-bold cursor-pointer shadow-2xs ${
                isLiked
                  ? 'bg-rose-50 border-rose-300 text-rose-600 scale-105'
                  : 'bg-white border-stone-200 hover:border-rose-300 text-stone-700 hover:text-rose-500'
              }`}
              title="Yêu thích bài viết"
            >
              <i className={`text-sm ${isLiked ? 'ph-fill ph-heart text-rose-500 animate-pulse' : 'ph ph-heart'}`}></i>
              <span>{likesCount}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200/90 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 font-bold transition-all text-xs shadow-2xs cursor-pointer"
            >
              <i className={`ph-bold ${copied ? 'ph-check text-emerald-600' : 'ph-share-network'}`}></i>
              <span>{copied ? 'Đã sao chép link!' : 'Chia sẻ'}</span>
            </button>

          </div>

        </div>

      </header>

      {/* 3. COVER IMAGE CINEMATIC */}
      {post.thumbnail && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-12">
          <div className="rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] bg-stone-100 shadow-[0_15px_40px_rgba(56,27,24,0.08)] border border-stone-200/80 group">
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-1000 ease-out"
            />
          </div>
          <p className="text-center text-[11px] text-stone-400 mt-3 font-serif-display italic">
            — Không gian ánh sáng & hương thơm chụp tại Candlet Botanical Studio —
          </p>
        </div>
      )}

      {/* 4. MAIN ARTICLE CONTENT */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8">
        
        {/* Quote Highlight Banner (Khối danh ngôn tâm đắc) */}
        {post.customDesign?.quoteHighlight && (
          <div
            className="my-12 p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-sm border border-stone-200/70"
            style={{
              backgroundColor: '#FFFFFF',
              borderLeft: `5px solid ${themeColor}`,
            }}
          >
            <div className="absolute top-4 right-6 opacity-10 pointer-events-none">
              <i className="ph-fill ph-quotes text-7xl" style={{ color: themeColor }}></i>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-stone-400 mb-2">
              Thông Điệp Khắc Ghi
            </p>
            <blockquote className="font-serif-display text-2xl sm:text-3xl italic leading-snug text-[#2C1810]">
              "{post.customDesign.quoteHighlight}"
            </blockquote>
          </div>
        )}

        {/* HTML Article Content */}
        <article
          className={`prose prose-stone max-w-none text-stone-700 font-normal ${fontSizeClasses}`}
        >
          <div
            dangerouslySetInnerHTML={{ __html: post.content }}
            className={`space-y-6 [&>h2]:font-serif-display [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-[#2A1412] [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-stone-200/60 [&>h3]:font-serif-display [&>h3]:text-xl sm:[&>h3]:text-2xl [&>h3]:font-bold [&>h3]:text-[#2A1412] [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:mb-5 [&>p]:leading-relaxed [&>blockquote]:font-serif-display [&>blockquote]:italic [&>blockquote]:border-l-4 [&>blockquote]:border-amber-600 [&>blockquote]:pl-6 [&>blockquote]:py-3 [&>blockquote]:my-8 [&>blockquote]:text-xl [&>blockquote]:text-[#2C1810] [&>blockquote]:bg-[#F7EFE8] [&>blockquote]:rounded-r-2xl [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-3 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-3 [&>img]:rounded-3xl [&>img]:my-8 [&>img]:shadow-md [&>figure>img]:rounded-3xl [&>figure>img]:my-6 [&>figure>img]:shadow-md [&>.candle-tip]:bg-amber-50 [&>.candle-tip]:border-l-4 [&>.candle-tip]:border-amber-500 [&>.candle-tip]:p-5 [&>.candle-tip]:rounded-r-2xl [&>.candle-tip]:my-6 [&>.scent-callout]:p-6 [&>.scent-callout]:rounded-2xl [&>.scent-callout]:bg-amber-50/80 [&>.scent-callout]:border [&>.scent-callout]:border-amber-200/80 [&>.scent-callout]:my-8 ${
              post.customDesign?.enableDropCap !== false
                ? '[&>p:first-of-type::first-letter]:text-5xl [&>p:first-of-type::first-letter]:font-serif-display [&>p:first-of-type::first-letter]:font-bold [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mr-3 [&>p:first-of-type::first-letter]:leading-none [&>p:first-of-type::first-letter]:text-[#381B18]'
                : ''
            }`}
          />
        </article>

        {/* Tags List */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-stone-200/70 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <i className="ph ph-tag"></i> Chủ đề:
            </span>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/stories?q=${encodeURIComponent(tag)}`}
                className="px-3.5 py-1 rounded-full bg-white border border-stone-200/90 text-stone-600 hover:text-[#4A2C2A] hover:border-[#4A2C2A] text-xs font-semibold transition-all shadow-2xs hover:scale-105"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* 4.5. READER REACTION & ENGAGEMENT BOX */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <i className="ph-fill ph-sparkle text-sm"></i>
              <span>Cảm xúc sau trang viết</span>
            </div>
            <h4 className="font-serif-display text-xl font-bold text-[#2A1412]">
              Câu chuyện này có chạm đến bạn?
            </h4>
            <p className="text-xs text-stone-500 max-w-md">
              Mỗi lượt tim là một lời động viên quý báu để người thợ nến tiếp tục chia sẻ những câu chuyện thơm ngát.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleLike}
              className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isLiked
                  ? 'bg-rose-600 text-white hover:bg-rose-700 scale-105 shadow-rose-200 ring-4 ring-rose-100'
                  : 'bg-[#FAF7F2] border border-stone-300 hover:border-rose-300 text-stone-700 hover:text-rose-600 hover:bg-rose-50/60'
              }`}
            >
              <i className={`text-base ${isLiked ? 'ph-fill ph-heart animate-pulse' : 'ph-bold ph-heart'}`}></i>
              <span>{isLiked ? 'Đã yêu thích' : 'Yêu thích câu chuyện'} ({likesCount})</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-600 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Chia sẻ câu chuyện"
            >
              <i className={`ph-bold ${copied ? 'ph-check text-emerald-600' : 'ph-share-network'}`}></i>
              <span>{copied ? 'Đã copy' : 'Chia sẻ'}</span>
            </button>
          </div>
        </div>

        {/* 5. AUTHOR POSTCARD (BƯU THIẾP TÁC GIẢ CANDLET) */}
        <div className="mt-14 p-8 sm:p-10 rounded-3xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          
          {/* Con dấu sáp đỏ rượu vang giả lập (Wax Seal) */}
          <div className="absolute top-6 right-6 w-14 h-14 rounded-full bg-[#50131A] text-amber-200 flex flex-col items-center justify-center shadow-md border-2 border-amber-400/40 transform rotate-12">
            <i className="ph-fill ph-flame text-lg"></i>
            <span className="text-[7px] uppercase font-bold tracking-wider">Atelier</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="w-18 h-18 rounded-2xl text-white flex items-center justify-center font-serif-display font-bold text-3xl shrink-0 shadow-md transform -rotate-3"
              style={{ backgroundColor: themeColor }}
            >
              {post.author ? post.author.charAt(0) : 'C'}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#8C4A32]">
                {post.customDesign?.authorRole || 'Tác Giả & Nghệ Nhân Chế Tác'}
              </span>
              <h4 className="font-serif-display text-2xl font-bold text-[#2C1810]">
                {post.author}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                Người nuôi dưỡng những ngọn lửa thủ công tại xưởng nến Candlet. Tin rằng mỗi mùi hương là một chìa khóa mở ra cánh cửa ký ức và xoa dịu những áp lực thường nhật.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-[#8C4A32]">
                <Link to="/shop" className="hover:underline flex items-center gap-1">
                  <i className="ph ph-shopping-bag"></i>
                  <span>Khám phá nến tại xưởng</span>
                </Link>
                <span>•</span>
                <Link to="/guide" className="hover:underline flex items-center gap-1">
                  <i className="ph ph-book-bookmark"></i>
                  <span>Cẩm nang chăm sóc</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 6. INVITATION BANNER (TRẢI NGHIỆM MÙI HƯƠNG TẬN TAY) */}
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-[#381B18] to-[#5A2722] text-amber-100 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1.5 text-center sm:text-left">
            <h4 className="font-serif-display text-2xl font-bold text-white">
              Cảm Nhận Mùi Hương Ngay Hôm Nay
            </h4>
            <p className="text-xs text-stone-300">
              Chọn cho mình một ngọn nến đậu nành thuần khiết để đồng hành trong những buổi tối thảnh thơi.
            </p>
          </div>
          <Link
            to="/shop"
            className="px-6 py-3 bg-amber-400 text-[#381B18] font-bold text-xs rounded-full hover:bg-amber-300 transition-all uppercase tracking-wider shrink-0 shadow-sm"
          >
            Ghé Thăm Cửa Hàng
          </Link>
        </div>

        {/* Navigation Back */}
        <div className="mt-12 text-center">
          <Link
            to="/stories"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-stone-300 text-stone-700 hover:border-[#381B18] hover:text-[#381B18] text-xs font-bold uppercase tracking-wider transition-all bg-white shadow-2xs"
          >
            <i className="ph-bold ph-arrow-left"></i>
            <span>Về Trang Danh Sách Câu Chuyện</span>
          </Link>
        </div>

      </main>

      {/* 7. RELATED STORIES (BÀI VIẾT CÙNG CHỦ ĐỀ) */}
      {relatedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-8 mt-24 pt-16 border-t border-stone-200/80">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8C4A32] block mb-2">
              Tiếp Nối Dòng Cảm Xúc
            </span>
            <h3 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#2C1810]">
              Những Câu Chuyện Cùng Chủ Đề
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedPosts.map((rel) => (
              <article
                key={rel._id}
                className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgba(74,44,42,0.1)] hover:-translate-y-1.5 transition-all duration-500 group flex flex-col"
              >
                <Link to={`/stories/${rel.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <img
                    src={rel.thumbnail || 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80'}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="text-[11px] text-stone-400 font-medium">{rel.readTime}</span>
                    <Link to={`/stories/${rel.slug}`}>
                      <h4 className="font-serif-display text-xl font-bold text-[#2C1810] group-hover:text-[#8C4A32] transition-colors leading-snug line-clamp-2">
                        {rel.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-normal">
                      {rel.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 mt-4 flex items-center justify-between">
                    <Link
                      to={`/stories/${rel.slug}`}
                      className="text-xs font-bold text-[#4A2C2A] group-hover:text-[#8C4A32] flex items-center gap-1 transition-colors"
                    >
                      <span>Đọc tiếp</span>
                      <i className="ph-bold ph-caret-right text-xs transition-transform group-hover:translate-x-1"></i>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
