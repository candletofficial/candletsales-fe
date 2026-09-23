import api from './api';

export const uploadService = {
  /**
   * Tải lên 1 ảnh đại diện sản phẩm (Cover Image)
   * @param {File} file - Đối tượng File từ input
   * @returns {Promise} Phản hồi chứa URL và đường dẫn relative của ảnh
   */
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    return api.post('/upload/product-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Tải lên nhiều ảnh chi tiết / bộ sưu tập sản phẩm (Gallery Images)
   * @param {FileList|File[]} files - Danh sách các tệp ảnh
   * @returns {Promise} Phản hồi chứa mảng các thông tin ảnh đã tải lên
   */
  uploadProductImages: async (files) => {
    const formData = new FormData();
    const fileList = Array.from(files);
    fileList.forEach((file) => {
      formData.append('images', file);
    });

    return api.post('/upload/product-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Yêu cầu máy chủ xóa file ảnh vật lý trên đĩa cứng
   * @param {string} path - Đường dẫn ảnh (relative /uploads/... hoặc full URL)
   * @returns {Promise}
   */
  deleteUploadedFile: async (path) => {
    return api.delete('/upload', {
      data: { path },
    });
  },
};

export default uploadService;
