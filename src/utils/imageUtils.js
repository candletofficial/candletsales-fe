/**
 * Tiện ích xử lý URL hình ảnh
 * Tương thích linh hoạt cả ở môi trường phát triển (localhost)
 * và khi đưa lên máy chủ/hosting (production)
 */

export const getImageUrl = (path) => {
  if (!path) return '';

  // Nếu là URL tuyệt đối hoặc base64/blob, trả về nguyên bản
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Lấy API URL từ biến môi trường (mặc định http://localhost:5000/api)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Cắt bỏ phần /api ở cuối URL để lấy origin của backend server
  const backendBase = apiUrl.replace(/\/api\/?$/, '');

  // Chuẩn hóa đường dẫn bắt đầu bằng dấu gạch chéo
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${backendBase}${cleanPath}`;
};

/**
 * Kiểm tra xem một URL/đường dẫn ảnh có phải là file tải lên lưu trữ nội bộ trên máy chủ hay không
 */
export const isLocalUploadedImage = (path) => {
  if (!path || typeof path !== 'string') return false;
  return path.includes('/uploads/') || path.startsWith('uploads/');
};
