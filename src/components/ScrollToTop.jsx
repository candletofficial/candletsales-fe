import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES = {
  '/': 'Candlet — Nến Thơm Thủ Công & Nghệ Thuật Mùi Hương',
  '/shop': 'Cửa Hàng Nến Thơm | Candlet',
  '/guide': 'Cẩm Nang Chăm Sóc Nến Thơm | Candlet',
  '/cam-nang': 'Cẩm Nang Chăm Sóc Nến Thơm | Candlet',
  '/stories': 'Câu Chuyện Mùi Hương & Cảm Xúc | Candlet',
  '/about': 'Về Candlet — Xưởng Nến Thủ Công',
  '/cart': 'Giỏ Hàng | Candlet',
  '/checkout': 'Thanh Toán Đơn Hàng | Candlet',
  '/orders': 'Tra Cứu Đơn Hàng | Candlet',
  '/wishlist': 'Danh Sách Yêu Thích | Candlet',
  '/profile': 'Tài Khoản Khách Hàng | Candlet',
  '/login': 'Đăng Nhập Khách Hàng | Candlet',
  '/register': 'Tạo Tài Khoản Khách Hàng | Candlet',

  // Admin Routes
  '/admin/login': 'Đăng Nhập Quản Trị | Candlet Admin',
  '/admin/register': 'Đăng Ký Quản Trị | Candlet Admin',
  '/admin/dashboard': 'Tổng Quan Kinh Doanh | Candlet Admin',
  '/admin/products': 'Quản Lý Sản Phẩm | Candlet Admin',
  '/admin/orders': 'Quản Lý Đơn Hàng | Candlet Admin',
  '/admin/pos': 'Bán Hàng Tại Quầy (POS) | Candlet Admin',
  '/admin/materials': 'Quản Lý Nguyên Vật Liệu | Candlet Admin',
  '/admin/imports': 'Quản Lý Nhập Kho | Candlet Admin',
  '/admin/inventory-checks': 'Kiểm Kê Kho | Candlet Admin',
  '/admin/ad-costs': 'Chi Phí Quảng Cáo | Candlet Admin',
  '/admin/coupons': 'Mã Giảm Giá | Candlet Admin',
  '/admin/fund': 'Quản Lý Quỹ | Candlet Admin',
  '/admin/expenses': 'Quản Lý Chi Phí | Candlet Admin',
  '/admin/users': 'Quản Trị Người Dùng | Candlet Admin',
  '/admin/posts': 'Quản Trị Bài Viết & Câu Chuyện | Candlet Admin',
  '/admin/settings': 'Cài Đặt Hệ Thống | Candlet Admin',
  '/admin/tools/shopee': 'Công Cụ Tính Phí Shopee | Candlet Admin',
  '/admin/tools/tiktok': 'Công Cụ Tính Phí TikTok Shop | Candlet Admin',
};

/**
 * Component tự động cuộn lên đầu trang & cập nhật tiêu đề trang web (document.title)
 * mỗi khi chuyển route (chuyển trang)
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // 0. Cập nhật tiêu đề trang web đúng chuẩn theo đường dẫn
    if (ROUTE_TITLES[pathname]) {
      document.title = ROUTE_TITLES[pathname];
    } else if (pathname.startsWith('/stories/')) {
      document.title = 'Câu Chuyện Nến Thơm | Candlet';
    } else if (pathname.startsWith('/product/')) {
      document.title = 'Chi Tiết Sản Phẩm | Candlet';
    } else if (pathname.startsWith('/order-success/')) {
      document.title = 'Đặt Hàng Thành Công | Candlet';
    } else if (pathname.startsWith('/admin')) {
      document.title = 'Quản Trị Hệ Thống | Candlet Admin';
    } else {
      document.title = 'Candlet — Nến Thơm Thủ Công & Nghệ Thuật Mùi Hương';
    }

    // Nếu URL có hash (ví dụ: #reviews, #details), cuộn mượt đến thẻ đó
    document.title = document.title.replaceAll('Candlet', 'CandletShop');

    if (hash) {
      const targetId = hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // 1. Cuộn window & document lên đỉnh đầu trang ngay lập tức
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // 2. Cuộn vùng chứa nội dung của trang Admin (.main-content) nếu có
    const adminMain = document.querySelector('.main-content');
    if (adminMain) {
      adminMain.scrollTop = 0;
    }

    // 3. Sử dụng requestAnimationFrame dự phòng trường hợp trang render bất đồng bộ
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (adminMain) adminMain.scrollTop = 0;
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, search, hash]);

  return null;
}
