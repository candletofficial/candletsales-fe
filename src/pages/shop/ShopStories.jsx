import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postService } from '../../services/postService';

const CATEGORIES = [
  { label: 'Tất cả', icon: 'ph-squares-four' },
  { label: 'Chữa Lành & Cảm Xúc', icon: 'ph-heart' },
  { label: 'Nghệ Thuật Mùi Hương', icon: 'ph-drop' },
  { label: 'Phong Cách Sống & Không Gian', icon: 'ph-sparkle' },
  { label: 'Hậu Trường Chế Tác', icon: 'ph-hammer' },
  { label: 'Liệu Pháp Thơm (Aromatherapy)', icon: 'ph-plant' },
];

export default function ShopStories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'Tất cả';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, searchParams]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const page = searchParams.get('page') || 1;
      const q = searchParams.get('q') || '';
      setSearchKeyword(q);

      const params = {
        page,
        limit: 9,
      };

      if (activeCategory !== 'Tất cả') {
        params.category = activeCategory;
      }
      if (q) {
        params.search = q;
      }

      const res = await postService.getPosts(params);
      if (res.data?.success) {
        setPosts(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết câu chuyện:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catLabel) => {
    const newParams = new URLSearchParams(searchParams);
    if (catLabel === 'Tất cả') {
      newParams.delete('category');
    } else {
      newParams.set('category', catLabel);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchKeyword.trim()) {
      newParams.set('q', searchKeyword.trim());
    } else {
      newParams.delete('q');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    }
  };

  // Featured Post - bài viết đầu tiên khi đang ở trang 1 và không có query search
  const featuredPost = posts.length > 0 && !searchParams.get('q') && activeCategory === 'Tất cả' ? posts[0] : null;
  const gridPosts = featuredPost ? posts.slice(1) : posts;

  return (
    <main className="relative min-h-screen overflow-hidden bg-white pb-12 font-jakarta text-[#2C1810] selection:bg-[#4A2C2A] selection:text-white sm:bg-[#FAF7F2] sm:pb-20 lg:pb-24">
      
      {/* Nền hiệu ứng hạt bụi sáng / sương mù ấm áp */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-amber-200/20 via-orange-100/10 to-transparent blur-3xl pointer-events-none -z-10"></div>

      {/* 1. HERO HEADER (Phong cách Tạp Chí Nghệ Thuật / Kinfolk Editorial) */}
      <header className="relative border-b-8 border-stone-100 bg-white py-7 sm:border-b sm:border-stone-200/70 sm:bg-gradient-to-b sm:from-[#F5EFE6] sm:via-[#FAF7F2] sm:to-[#FAF7F2] sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-5xl px-4 text-left sm:px-8 sm:text-center">
          
          {/* Breadcrumbs */}
          <div className="mb-6 hidden items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500 sm:flex">
            <Link to="/" className="sm:hover:text-[#4A2C2A] transition-colors">Trang Chủ</Link>
            <span className="text-stone-300">/</span>
            <span className="text-[#8C4A32]">Candlet Journal</span>
          </div>

          {/* Glowing Badge */}
          <div className="mb-5 hidden items-center gap-2.5 rounded-full border border-amber-300/60 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 shadow-[0_2px_10px_rgba(217,119,6,0.1)] backdrop-blur-sm sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="tracking-[0.15em] text-[11px]">Nghệ Thuật Sống & Mùi Hương Chánh Niệm</span>
          </div>

          {/* Main Title */}
          <h1 className="mb-3 font-serif-display text-3xl font-bold leading-[1.12] tracking-tight text-[#381B18] sm:mb-6 sm:text-6xl lg:text-7xl">
            Những Câu Chuyện <br className="hidden sm:inline" />
            <span className="italic font-normal bg-gradient-to-r from-[#8C4A32] via-[#B45309] to-[#8C4A32] bg-clip-text text-transparent">
              Bên Ánh Lửa Trầm
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-xs font-normal leading-relaxed text-stone-600 sm:text-base">
            Nơi ghi chép những rung động thanh thuần về nghệ thuật khứu giác, bí quyết chăm sóc nến bấc gỗ và những phút giây dừng lại để vỗ về tâm hồn.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="group relative mx-auto mt-6 max-w-md sm:mt-9">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 blur-md opacity-0 sm:group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center">
              <i className="ph ph-magnifying-glass absolute left-4.5 text-stone-400 text-base"></i>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm chủ đề, mùi hương, bí quyết..."
                className="w-full rounded-full border border-stone-200/90 bg-white/95 py-3 pl-11 pr-12 text-xs text-stone-800 shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-stone-400 focus:border-[#4A2C2A] focus:ring-2 focus:ring-[#4A2C2A]/10 sm:py-3.5 sm:pl-12 sm:pr-28 sm:text-sm"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('q');
                    setSearchParams(newParams);
                  }}
                  className="absolute right-11 cursor-pointer p-1 text-xs text-stone-400 sm:hover:text-stone-600 sm:right-24"
                  title="Xóa tìm kiếm"
                >
                  <i className="ph-bold ph-x"></i>
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#4A2C2A] text-xs font-bold text-amber-100 shadow-xs transition-all sm:hover:bg-[#2A1412] sm:hover:text-white sm:h-auto sm:w-auto sm:gap-1.5 sm:px-5 sm:py-2.5"
              >
                <span className="hidden sm:inline">Tìm kiếm</span>
                <i className="ph-bold ph-arrow-right sm:hidden"></i>
              </button>
            </div>
          </form>

        </div>
      </header>

      {/* 2. CATEGORY PILLS (Organic Minimalist Filter) */}
      <nav className="sticky top-20 z-20 mb-0 border-b border-stone-200 bg-white/95 py-2 backdrop-blur-md sm:mb-8 sm:bg-[#FAF7F2]/90 sm:py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleCategoryChange(cat.label)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2.5 text-xs font-semibold transition-all duration-300 sm:rounded-full sm:border-b-0 sm:px-4.5 sm:py-2 ${
                    isSelected
                      ? 'border-[#381B18] text-[#381B18] sm:bg-[#381B18] sm:text-amber-100 sm:shadow-[0_4px_15px_rgba(56,27,24,0.2)]'
                      : 'border-transparent text-stone-500 sm:hover:text-[#381B18] sm:border sm:border-stone-200/70 sm:bg-white/80 sm:text-stone-600 sm:hover:bg-white'
                  }`}
                >
                  <i className={`ph ${cat.icon} text-sm ${isSelected ? 'text-amber-400' : 'text-stone-400'}`}></i>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        
        {loading ? (
          <div className="py-28 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-amber-800/20 border-t-amber-800 animate-spin"></div>
            <p className="font-serif-display italic text-base text-stone-600">Đang mở những trang sách bình yên...</p>
          </div>
        ) : posts.length === 0 ? (
          <section className="mx-auto max-w-xl space-y-4 py-16 text-center sm:rounded-3xl sm:border sm:border-stone-200/80 sm:bg-white sm:p-10 sm:shadow-sm">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mx-auto text-3xl">
              <i className="ph-thin ph-book-open"></i>
            </div>
            <h3 className="font-serif-display text-2xl font-bold text-stone-800">Chưa tìm thấy câu chuyện</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Không có bài viết nào phù hợp với bộ lọc hoặc từ khóa hiện tại. Hãy thử tìm từ khóa khác hoặc chọn danh mục khác nhé!
            </p>
            <button
              type="button"
              onClick={() => handleCategoryChange('Tất cả')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#4A2C2A] uppercase tracking-wider sm:hover:underline pt-2"
            >
              <span>Xem tất cả câu chuyện</span>
              <i className="ph-bold ph-arrow-right"></i>
            </button>
          </section>
        ) : (
          <div className="space-y-8 sm:space-y-14">
            
            {/* 🌟 FEATURED STORY (BÀI TIÊU ĐIỂM - MAGAZINE SPREAD) */}
            {featuredPost && (
              <article className="group relative grid grid-cols-1 gap-0 overflow-hidden border-b-8 border-stone-100 bg-white transition-all duration-500 sm:rounded-3xl sm:border sm:border-stone-200/90 sm:shadow-[0_10px_35px_rgba(74,44,42,0.06)] sm:hover:shadow-[0_20px_45px_rgba(74,44,42,0.1)] lg:grid-cols-12">
                
                {/* Visual Image */}
                <div className="relative -mx-4 aspect-[16/10] min-h-[240px] overflow-hidden bg-stone-100 sm:mx-0 sm:min-h-[320px] lg:col-span-7 lg:aspect-auto lg:min-h-[460px]">
                  <img
                    src={featuredPost.thumbnail || 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=80'}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden"></div>
                  
                  {/* Badge */}
                  <div className="absolute top-5 left-5 bg-[#381B18]/90 backdrop-blur-md text-amber-200 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-amber-400/30 flex items-center gap-2 shadow-md">
                    <i className="ph-fill ph-sparkle text-amber-400"></i>
                    <span>Chuyên Đề Tuyển Chọn</span>
                  </div>
                </div>

                {/* Editorial Content */}
                <div className="flex flex-col justify-between bg-white py-6 sm:bg-gradient-to-b sm:from-white sm:via-white sm:to-[#FAF7F2]/40 sm:p-12 lg:col-span-5">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500">
                      <span className="font-bold text-[#8C4A32] uppercase tracking-widest text-[11px]">
                        {featuredPost.category}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="flex items-center gap-1">
                        <i className="ph ph-clock"></i>
                        {featuredPost.readTime}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="flex items-center gap-1 text-stone-500" title="Lượt xem">
                        <i className="ph ph-eye text-stone-400"></i>
                        {featuredPost.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-rose-500 font-medium" title="Lượt tim">
                        <i className="ph-fill ph-heart text-rose-500 text-xs"></i>
                        {featuredPost.likesCount || 0}
                      </span>
                    </div>

                    <Link to={`/stories/${featuredPost.slug}`}>
                      <h2 className="font-serif-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C1810] sm:group-hover:text-[#8C4A32] transition-colors leading-[1.2]">
                        {featuredPost.title}
                      </h2>
                    </Link>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-4 font-normal">
                      {featuredPost.summary}
                    </p>

                    {featuredPost.customDesign?.quoteHighlight && (
                      <div className="relative pl-5 py-2 my-2 border-l-2 border-amber-600/70">
                        <p className="italic text-xs sm:text-sm text-stone-700 font-serif-display leading-relaxed">
                          "{featuredPost.customDesign.quoteHighlight}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-8">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#381B18] text-amber-200 flex items-center justify-center font-bold text-xs">
                        {featuredPost.author ? featuredPost.author.charAt(0) : 'C'}
                      </div>
                      <div className="text-xs">
                        <span className="text-stone-400 block text-[10px]">Người viết</span>
                        <strong className="text-stone-800 font-medium">{featuredPost.author}</strong>
                      </div>
                    </div>

                    <Link
                      to={`/stories/${featuredPost.slug}`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#381B18] px-5 py-2.5 rounded-full sm:hover:bg-[#502621] transition-all shadow-xs sm:group-hover:translate-x-1"
                    >
                      <span>Khám phá</span>
                      <i className="ph-bold ph-arrow-right"></i>
                    </Link>
                  </div>
                </div>
              </article>
            )}

            {/* 📖 GRID ARTICLES (CÁC BÀI VIẾT NGHỆ THUẬT) */}
            <div>
              {featuredPost && (
                <div className="mb-5 flex items-center justify-between border-b border-stone-200 pb-3 sm:mb-8">
                  <h3 className="font-serif-display text-2xl font-bold text-[#381B18]">
                    Tất Cả Câu Chuyện ({pagination.total || posts.length})
                  </h3>
                  <span className="hidden text-xs italic text-stone-400 sm:inline">Cập nhật liên tục từ xưởng nến</span>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {gridPosts.map((post) => {
                  const themeColor = post.customDesign?.themeColor || '#4A2C2A';
                  return (
                    <article
                      key={post._id}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_3px_14px_rgba(74,44,42,0.06)] transition-all duration-500 md:rounded-3xl md:hover:-translate-y-1.5 md:hover:shadow-[0_15px_35px_rgba(74,44,42,0.1)]"
                    >
                      {/* Image Thumbnail */}
                      <Link to={`/stories/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-stone-100">
                        <img
                          src={post.thumbnail || 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80'}
                          alt={post.title}
                          className="w-full h-full object-cover sm:group-hover:scale-108 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity"></div>
                        
                        {/* Category Tag */}
                        <span
                          className="absolute bottom-3.5 left-3.5 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md backdrop-blur-md"
                          style={{ backgroundColor: `${themeColor}E6` }}
                        >
                          {post.category}
                        </span>
                      </Link>

                      {/* Card Content */}
                      <div className="flex flex-1 flex-col justify-between space-y-4 p-4 md:p-7">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                            <span>{new Date(post.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <div className="flex items-center gap-2.5">
                              <span className="flex items-center gap-1 font-medium text-stone-500">
                                <i className="ph ph-clock text-amber-700"></i> {post.readTime}
                              </span>
                              <span className="flex items-center gap-1 text-stone-400" title="Lượt xem">
                                <i className="ph ph-eye"></i> {post.viewCount || 0}
                              </span>
                              <span className="flex items-center gap-1 text-rose-500 font-medium" title="Lượt tim">
                                <i className="ph-fill ph-heart text-xs"></i> {post.likesCount || 0}
                              </span>
                            </div>
                          </div>

                          <Link to={`/stories/${post.slug}`} className="block">
                            <h3 className="font-serif-display text-xl sm:text-2xl font-bold text-[#2C1810] sm:group-hover:text-[#8C4A32] transition-colors leading-snug line-clamp-2">
                              {post.title}
                            </h3>
                          </Link>

                          <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed line-clamp-3">
                            {post.summary}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs mt-auto">
                          <span className="text-stone-500 italic truncate max-w-[140px]">
                            {post.author}
                          </span>
                          <Link
                            to={`/stories/${post.slug}`}
                            className="font-bold text-[#4A2C2A] sm:group-hover:text-[#8C4A32] flex items-center gap-1 transition-colors"
                          >
                            <span>Đọc tiếp</span>
                            <i className="ph-bold ph-caret-right text-xs transition-transform sm:group-hover:translate-x-1"></i>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* 4. PHÂN TRANG HIỆN ĐẠI */}
            {pagination.totalPages > 1 && (
              <div className="pt-10 border-t border-stone-200/70 flex items-center justify-center gap-2">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const p = i + 1;
                  const isCurrent = Number(searchParams.get('page') || 1) === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('page', p);
                        setSearchParams(newParams);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className={`w-10 h-10 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#381B18] text-amber-100 shadow-md scale-105'
                          : 'bg-white border border-stone-200 text-stone-700 sm:hover:border-[#381B18]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 5. NEWSLETTER ATELIER (LÁ THƯ HƯƠNG THƠM) */}
            <section className="relative -mx-4 mt-12 overflow-hidden bg-[#381B18] px-4 py-10 text-amber-100 sm:mx-0 sm:mt-20 sm:rounded-3xl sm:p-14 sm:shadow-xl">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                <i className="ph-fill ph-flame text-[300px] text-amber-200"></i>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto text-center space-y-5">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-amber-300 text-2xl">
                  <i className="ph ph-envelope-open"></i>
                </div>

                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300/80 block">
                  Candlet Scent Letter Club
                </span>

                <h3 className="font-serif-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Nhận Những Lá Thư Hương Thơm Mỗi Tuần
                </h3>

                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  Đăng ký để nhận những bài viết chiêm nghiệm mới nhất, công thức pha chế tinh dầu độc quyền và quà tặng mini dành riêng cho thành viên thân thiết.
                </p>

                {newsletterSubscribed ? (
                  <div className="p-4 rounded-full bg-emerald-900/60 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 animate-fade-in">
                    <i className="ph-bold ph-check-circle text-base"></i>
                    <span>Cảm ơn bạn! Lá thư đầu tiên sẽ sớm được gửi đến hộp thư của bạn.</span>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Nhập địa chỉ email của bạn..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3.5 text-xs text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-300 focus:bg-white/15"
                    />
                    <button
                      type="submit"
                      className="px-7 py-3.5 bg-amber-400 text-[#381B18] font-bold text-xs rounded-full sm:hover:bg-amber-300 transition-all uppercase tracking-wider cursor-pointer shrink-0"
                    >
                      Đăng Ký
                    </button>
                  </form>
                )}

                <div className="text-[10px] text-stone-400 flex items-center justify-center gap-3 pt-2">
                  <span>🔒 Không spam</span>
                  <span>•</span>
                  <span>Huỷ đăng ký bất cứ lúc nào</span>
                </div>
              </div>
            </section>

          </div>
        )}
      </div>

    </main>
  );
}
