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
    <div className="min-h-[70vh] py-10 sm:py-16 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Breadcrumb navigation */}
        <nav className="flex items-center space-x-2 text-xs text-stone-500 mb-6 font-medium">
          <Link to="/" className="hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-800 font-bold">Sản Phẩm Yêu Thích</span>
        </nav>

        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-8 border-b border-stone-200/80 gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/70 text-rose-700 text-[11px] font-bold uppercase tracking-wider mb-2">
              <i className="ph-fill ph-heart text-xs"></i>
              <span>Bộ Sưu Tập Của Riêng Bạn</span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-normal text-stone-900 tracking-tight">
              Sản Phẩm Yêu Thích
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
              Những ngọn nến thơm và làn hương chạm đến cảm xúc của bạn đã được nâng niu lưu lại tại đây.
            </p>
          </div>

          {wishlist.length > 0 && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-xs font-mono font-bold text-stone-600 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
                {wishlist.length} sản phẩm
              </span>
              <button
                onClick={clearWishlist}
                className="text-xs text-stone-400 hover:text-red-600 transition-colors font-medium hover:underline underline-offset-4"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {wishlist.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-16 text-center border border-stone-200/80 shadow-xs max-w-2xl mx-auto my-8">
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
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#4A2C2A] hover:bg-[#381B18] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
            >
              <span>Khám Phá Cửa Hàng Ngay</span>
              <i className="ph-bold ph-arrow-right text-xs"></i>
            </Link>
          </div>
        ) : (
          /* Populated Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {wishlist.map(product => {
              const hasVariants = product.skus && product.skus.length > 0;
              const isAdding = addingId === product._id;
              const isAddedSuccess = addedSuccessId === product._id;

              return (
                <div
                  key={product._id}
                  className="group bg-white rounded-2xl border border-stone-200/80 hover:border-stone-300 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 relative"
                >
                  {/* Top image & Tag */}
                  <div>
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 mb-4">
                      {product.tag && (
                        <span
                          className="absolute top-2.5 left-2.5 z-10 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-xs"
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
                        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-rose-500 hover:text-stone-400 hover:scale-110 flex items-center justify-center shadow-xs transition-all"
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
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            No Image
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* Category & Scent note */}
                    <div className="mb-1 flex items-center justify-between text-[11px] font-mono text-stone-400 uppercase tracking-wider">
                      <span>{product.category?.name || 'Nến Thơm'}</span>
                      {product.scent?.name && (
                        <span className="text-amber-800 font-bold truncate max-w-[120px]">
                          ✦ {product.scent.name}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <Link
                      to={`/product/${product._id}`}
                      className="block font-serif-display text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-1 mb-2"
                      title={product.name}
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    <div className="text-sm font-extrabold text-stone-900 font-mono mb-4">
                      {new Intl.NumberFormat('vi-VN').format(product.base_price || 0)}đ
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={isAdding}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        isAddedSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#4A2C2A] hover:bg-[#381B18] text-white'
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
                      className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
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
