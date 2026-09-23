import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const getStorageKey = (userId) => `candlet_wishlist_${userId}`;

  // Khi user thay đổi (đăng nhập / đăng xuất / đổi tài khoản)
  useEffect(() => {
    if (user && user._id) {
      try {
        const saved = localStorage.getItem(getStorageKey(user._id));
        if (saved) {
          setWishlist(JSON.parse(saved));
        } else {
          setWishlist([]);
        }
      } catch (e) {
        console.error('Lỗi khi đọc wishlist từ localStorage:', e);
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
  }, [user?._id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const saveWishlist = (newList) => {
    setWishlist(newList);
    if (user && user._id) {
      try {
        localStorage.setItem(getStorageKey(user._id), JSON.stringify(newList));
      } catch (e) {
        console.error('Lỗi khi lưu wishlist vào localStorage:', e);
      }
    }
  };

  const isInWishlist = (productId) => {
    if (!productId) return false;
    return wishlist.some(item => (item._id === productId || item.id === productId));
  };

  const toggleWishlist = (product, navigate) => {
    // Nếu chưa đăng nhập -> chuyển sang trang login
    if (!user) {
      if (navigate) {
        navigate('/login', {
          state: {
            from: window.location.pathname,
            message: 'Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích!'
          }
        });
      }
      return false;
    }

    if (!product || !product._id) return false;

    const exists = isInWishlist(product._id);
    let updatedList;
    if (exists) {
      updatedList = wishlist.filter(item => item._id !== product._id && item.id !== product._id);
      showToast(`Đã xóa "${product.name}" khỏi yêu thích`);
    } else {
      // Lưu snapshot sản phẩm
      const snapshot = {
        _id: product._id,
        name: product.name,
        image: product.image,
        images: product.images,
        base_price: product.base_price,
        tag: product.tag,
        tag_color: product.tag_color,
        category: product.category,
        scent: product.scent,
        stock: product.stock
      };
      updatedList = [snapshot, ...wishlist];
      showToast(`Đã lưu "${product.name}" vào yêu thích ❤️`);
    }

    saveWishlist(updatedList);
    return !exists;
  };

  const removeFromWishlist = (productId) => {
    const updatedList = wishlist.filter(item => item._id !== productId && item.id !== productId);
    saveWishlist(updatedList);
    showToast('Đã xóa khỏi danh sách yêu thích');
  };

  const clearWishlist = () => {
    saveWishlist([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2C1810]/95 backdrop-blur-md text-[#F3E8E2] px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/30 text-xs font-semibold flex items-center gap-2.5 animate-[toastIn_0.3s_ease]">
          <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <i className="ph-fill ph-heart text-xs"></i>
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
