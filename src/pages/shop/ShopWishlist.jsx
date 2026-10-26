import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';

export default function ShopWishlist() {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [addingId, setAddingId] = useState(null);
  const [addedSuccessId, setAddedSuccessId] = useState(null);

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Nếu sản phẩm có biến thể (skus), chuyển sang trang chi tiết để khách chọn mùi hương/kích thước
    if (product.skus && product.skus.length > 0) {
      navigate(`/product/${product._id}`);
      return;
    }

    try {
      setAddingId(product._id);
      const res = await addToCart({
        product_id: product._id,
        quantity: 1
      });
      if (res && res.success) {
        setAddedSuccessId(product._id);
        setTimeout(() => setAddedSuccessId(null), 2000);
      }
    } catch (err) {
      console.error('Lỗi khi thêm vào giỏ:', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFCF8] pb-8 pt-5 sm:bg-brand-cream sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Breadcrumb navigation */}
        <nav className="mb-6 hidden items-center space-x-2 text-xs font-medium text-stone-500 sm:flex">
          <Link to="/" className="sm:hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-800 font-bold">Sản Phẩm Yêu Thích</span>
        </nav>

        {/* Header Title Section */}
        <div className="mb-0 flex flex-col justify-between gap-3 border-b border-[#EDE3DC] pb-4 sm:mb-10 sm:flex-row sm:items-end sm:gap-4 sm:pb-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-600 sm:rounded-full sm:border sm:border-rose-200/70 sm:bg-rose-50 sm:px-3 sm:py-1 sm:text-[11px]">
              <i className="ph-fill ph-heart text-xs"></i>
              <span>Bộ Sưu Tập Của Riêng Bạn</span>
            </div>
            <h1 className="font-serif-display text-[28px] font-normal leading-tight tracking-tight text-[#3B2422] sm:text-4xl lg:text-5xl">
              Sản Phẩm Yêu Thích
            </h1>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-stone-500 sm:text-sm">
              Những ngọn nến thơm và làn hương chạm đến cảm xúc của bạn đã được nâng niu lưu lại tại đây.
            </p>
          </div>

          {wishlist.length > 0 && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-[#6D514B]">
                {wishlist.length} sản phẩm
              </span>
              <button
                onClick={clearWishlist}
                className="text-xs text-stone-400 sm:hover:text-red-600 transition-colors font-medium sm:hover:underline underline-offset-4"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {wishlist.length === 0 ? (
          <section className="mx-auto max-w-2xl px-3 py-8 text-center sm:py-16">
            <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 border border-rose-200/60 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <i className="ph-fill ph-heart text-3xl animate-pulse"></i>
            </div>
            <h3 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
              Danh sách yêu thích đang trống
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed mb-8">
              Bạn chưa lưu ngọn nến nào vào danh sách. Hãy ghé thăm cửa hàng và nhấn vào biểu tượng trái tim để ghi nhớ các mùi hương bạn say mê nhé!
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-burgundy sm:hover:bg-brand-deepWine text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm sm:hover:shadow-md sm:hover:scale-[1.02] transition-all"
            >
              <span>Khám Phá Cửa Hàng Ngay</span>
              <i className="ph-bold ph-arrow-right text-xs"></i>
            </Link>
          </section>
        ) : (
          /* Populated Grid */
          <div className="grid grid-cols-2 gap-3 pt-5 sm:gap-8 sm:pt-0 lg:grid-cols-3 xl:grid-cols-4">
            {wishlist.map(product => {
              const hasVariants = product.skus && product.skus.length > 0;
              const isAdding = addingId === product._id;
              const isAddedSuccess = addedSuccessId === product._id;

              return (
                <div
                  key={product._id}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#EADFD7] bg-white shadow-[0_3px_14px_rgba(74,44,42,0.06)] transition-all duration-300 sm:hover:border-[#D8C8BD] sm:hover:shadow-[0_10px_28px_rgba(74,44,42,0.11)] sm:justify-between sm:p-5"
                >
                  {/* Top image & Tag */}
                  <div className="flex flex-1 flex-col sm:block">
                    <div className="relative aspect-square overflow-hidden bg-[#F6F1EB] sm:mb-4 sm:rounded-xl">
                      {product.tag && (
                        <span
                          className="absolute left-2 top-2 z-10 rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm sm:left-2.5 sm:top-2.5 sm:text-[9px]"
                          style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                        >
                          {product.tag}
                        </span>
                      )}

                      {/* Heart Button to Remove */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromWishlist(product._id);
                        }}
                        className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border border-white/70 bg-white/90 text-rose-500 shadow-sm backdrop-blur-xs transition-all sm:hover:scale-110 sm:hover:text-stone-400 sm:right-2.5 sm:top-2.5"
                        title="Bỏ khỏi yêu thích"
                      >
                        <i className="ph-fill ph-heart text-base"></i>
                      </button>

                      {/* Link to detail */}
                      <Link to={`/product/${product._id}`} className="block w-full h-full">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            No Image
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* Category & Scent note */}
                    <div className="mb-1 flex min-w-0 items-center justify-between px-3 pt-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-stone-400 sm:px-0 sm:pt-0 sm:text-[11px]">
                      <span>{product.category?.name || 'Nến Thơm'}</span>
                      {product.scent?.name && (
                        <span className="hidden max-w-[120px] truncate font-bold text-amber-800 sm:inline">
                          ✦ {product.scent.name}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <Link
                      to={`/product/${product._id}`}
                      className="mb-1.5 block min-h-9 line-clamp-2 px-3 font-serif-display text-sm font-bold leading-[1.3] text-stone-900 transition-colors sm:group-hover:text-brand-terracotta sm:mb-2 sm:min-h-0 sm:line-clamp-1 sm:px-0 sm:text-lg"
                      title={product.name}
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    <div className="mb-2 mt-auto px-3 font-mono text-[13px] font-extrabold text-brand-terracotta sm:mb-4 sm:px-0 sm:text-sm sm:text-stone-900">
                      {new Intl.NumberFormat('vi-VN').format(product.base_price || 0)}đ
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-[#F0E8E2] px-2.5 pb-2.5 pt-2.5 sm:gap-2 sm:px-0 sm:pb-0 sm:pt-3">
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={isAdding}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[9px] font-bold uppercase tracking-wide shadow-sm transition-all active:scale-[0.98] sm:gap-1.5 sm:px-3 sm:text-xs ${
                        isAddedSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-brand-burgundy sm:hover:bg-brand-deepWine text-white'
                      }`}
                    >
                      {isAdding ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : isAddedSuccess ? (
                        <>
                          <i className="ph-bold ph-check text-sm"></i>
                          <span>Đã thêm!</span>
                        </>
                      ) : hasVariants ? (
                        <>
                          <i className="ph-bold ph-sliders text-sm"></i>
                          <span>Tùy Chọn</span>
                        </>
                      ) : (
                        <>
                          <i className="ph-bold ph-shopping-bag-open text-sm"></i>
                          <span>Thêm Giỏ</span>
                        </>
                      )}
                    </button>

                    <Link
                      to={`/product/${product._id}`}
                      className="rounded-xl border border-[#E8DED7] bg-white p-2.5 text-stone-500 transition-colors sm:hover:bg-stone-100 sm:hover:text-stone-900"
                      title="Xem chi tiết sản phẩm"
                    >
                      <i className="ph-bold ph-eye text-base"></i>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
