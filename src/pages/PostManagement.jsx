import { useState, useEffect } from 'react';
import { postService } from '../services/postService';
import Layout from '../components/Layout';

const CATEGORIES = [
  'Nghệ Thuật Mùi Hương',
  'Chữa Lành & Cảm Xúc',
  'Liệu Pháp Thơm (Aromatherapy)',
  'Phong Cách Sống & Không Gian',
  'Hậu Trường Chế Tác',
];

const PRESET_COLORS = [
  { name: 'Nâu Sáp Ấm (Mặc định)', hex: '#4A2C2A' },
  { name: 'Nâu Đất Nung', hex: '#8C4A32' },
  { name: 'Xanh Rêu Rừng', hex: '#2D4A3E' },
  { name: 'Vàng Hổ Phách', hex: '#B45309' },
  { name: 'Đỏ Rượu Vang', hex: '#5C2424' },
  { name: 'Xám Tro Trầm', hex: '#3E424B' },
];

const AMBIENT_MOOD_SUGGESTIONS = [
  'Tiếng gỗ cháy lách tách trong lò sưởi',
  'Tiếng mưa rơi tí tách bên thềm cửa sổ',
  'Giai điệu Jazz hoàng hôn tại Paris',
  'Bản nhạc thiền định & chuông gió thanh tịnh',
  'Sớm mai sương mờ trong rừng thông Đà Lạt',
];

// Helper: Phân giải HTML sẵn có thành danh sách Khối (Blocks) trực quan
function htmlToBlocks(html) {
  if (!html || typeof html !== 'string') {
    return [{ id: 'b_1', type: 'paragraph', content: '' }];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.children);

    if (nodes.length === 0) {
      const text = doc.body.textContent || '';
      return [{ id: 'b_1', type: 'paragraph', content: text }];
    }

    const blocks = [];
    nodes.forEach((node, index) => {
      const id = `b_${Date.now()}_${index}`;
      const tag = node.tagName.toLowerCase();

      if (tag === 'h2') {
        blocks.push({ id, type: 'heading2', content: node.textContent.trim() });
      } else if (tag === 'h3') {
        blocks.push({ id, type: 'heading3', content: node.textContent.trim() });
      } else if (tag === 'blockquote') {
        blocks.push({ id, type: 'quote', content: node.textContent.trim().replace(/^["']|["']$/g, '') });
      } else if (node.classList.contains('candle-tip')) {
        const text = node.textContent.replace(/^💡\s*Mẹo nến từ nghệ nhân:\s*/i, '').trim();
        blocks.push({ id, type: 'tip', content: text });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(node.querySelectorAll('li')).map((li) => li.textContent.trim());
        blocks.push({ id, type: 'list', items: items.length > 0 ? items : [''] });
      } else if (tag === 'figure' || tag === 'img') {
        const img = tag === 'img' ? node : node.querySelector('img');
        const caption = node.querySelector('figcaption')?.textContent || '';
        blocks.push({ id, type: 'image', url: img?.getAttribute('src') || '', caption });
      } else if (node.classList.contains('scent-callout')) {
        const title = node.querySelector('h4')?.textContent || '';
        const desc = node.querySelector('p')?.textContent || '';
        const link = node.querySelector('a')?.getAttribute('href') || '/shop';
        blocks.push({ id, type: 'callout', title, description: desc, link });
      } else {
        const content = node.textContent.trim();
        if (content) {
          blocks.push({ id, type: 'paragraph', content });
        }
      }
    });

    return blocks.length > 0 ? blocks : [{ id: 'b_1', type: 'paragraph', content: '' }];
  } catch (err) {
    return [{ id: 'b_1', type: 'paragraph', content: html }];
  }
}

// Helper: Biên dịch danh sách Khối (Blocks) thành HTML chuẩn đẹp mắt
function blocksToHtml(blocks) {
  if (!blocks || blocks.length === 0) return '';

  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading2':
          return `<h2>${block.content || ''}</h2>`;
        case 'heading3':
          return `<h3>${block.content || ''}</h3>`;
        case 'paragraph':
          return `<p>${block.content || ''}</p>`;
        case 'quote':
          return `<blockquote>"${block.content || ''}"</blockquote>`;
        case 'tip':
          return `<div class="candle-tip"><strong>💡 Mẹo nến từ nghệ nhân:</strong> ${block.content || ''}</div>`;
        case 'list': {
          const lis = (block.items || [])
            .filter((item) => item.trim())
            .map((item) => `<li>${item}</li>`)
            .join('');
          return lis ? `<ul>${lis}</ul>` : '';
        }
        case 'image':
          return block.url
            ? `<figure><img src="${block.url}" alt="${block.caption || 'Minh họa'}" /><figcaption class="text-xs text-stone-400 italic text-center mt-2">${block.caption || ''}</figcaption></figure>`
            : '';
        case 'callout':
          return `<div class="scent-callout p-6 rounded-2xl bg-amber-50/80 border border-amber-200/80 my-8">
            <h4 class="font-serif-display text-xl font-bold text-[#381B18] mb-2">${block.title || 'Mùi hương gợi ý'}</h4>
            <p class="text-xs text-stone-600 mb-4 leading-relaxed">${block.description || ''}</p>
            <a href="${block.link || '/shop'}" class="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2C2A] uppercase tracking-wider hover:underline">
              <span>Trải nghiệm ngay</span> →
            </a>
          </div>`;
        default:
          return `<p>${block.content || ''}</p>`;
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalPublished: 0, totalDraft: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('blocks'); // 'blocks' | 'design' | 'preview' | 'html'
  const [editingPost, setEditingPost] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form Basic Info
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    thumbnail: '',
    category: 'Nghệ Thuật Mùi Hương',
    author: 'Nghệ nhân Candlet',
    readTime: '5 phút đọc',
    isPublished: true,
    tags: ['Nến Thơm', 'Chánh Niệm'],
    customDesign: {
      themeColor: '#4A2C2A',
      fontStyle: 'serif',
      layoutStyle: 'editorial',
      quoteHighlight: '',
      authorRole: 'Nghệ nhân chế tác nến & Chuyên gia khứu giác',
      ambientMood: 'Tiếng gỗ cháy lách tách trong lò sưởi',
      enableDropCap: true,
      productPairing: {
        name: '',
        scentNotes: '',
        link: '/shop',
      },
    },
  });

  // Visual Blocks State (Thay thế hoàn toàn việc gõ HTML rối rắm)
  const [blocks, setBlocks] = useState([
    { id: 'b_1', type: 'paragraph', content: '' },
  ]);

  // Raw HTML fallback for advanced view
  const [rawHtml, setRawHtml] = useState('');

  // New Tag input state
  const [tagInput, setTagInput] = useState('');

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, statusFilter]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (selectedCategory) params.category = selectedCategory;
      if (statusFilter !== '') params.isPublished = statusFilter;
      if (search) params.search = search;

      const res = await postService.getAdminPosts(params);
      if (res.data?.success) {
        setPosts(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi tải danh sách bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setModalTab('blocks');
    setFormData({
      title: '',
      summary: '',
      thumbnail: '',
      category: 'Nghệ Thuật Mùi Hương',
      author: 'Nghệ nhân Candlet',
      readTime: '5 phút đọc',
      isPublished: true,
      tags: ['Nến Thơm', 'Chánh Niệm', 'Thủ Công'],
      customDesign: {
        themeColor: '#4A2C2A',
        fontStyle: 'serif',
        layoutStyle: 'editorial',
        quoteHighlight: '',
        authorRole: 'Nghệ nhân chế tác nến & Chuyên gia khứu giác',
        ambientMood: 'Tiếng gỗ cháy lách tách trong lò sưởi',
        enableDropCap: true,
        productPairing: {
          name: '',
          scentNotes: '',
          link: '/shop',
        },
      },
    });

    // Khởi tạo các khối mẫu thân thiện
    setBlocks([
      { id: 'b_1', type: 'paragraph', content: 'Những khoảnh khắc dịu dàng nhất trong ngày thường bắt đầu khi ngọn nến thơm được thắp lên...' },
      { id: 'b_2', type: 'heading2', content: 'Giai điệu của từng tầng hương' },
      { id: 'b_3', type: 'paragraph', content: 'Khi sáp đậu nành tan chảy, tinh dầu thiên nhiên bắt đầu khuếch tán vào không gian, mang theo sự thư thái và xua tan những mệt mỏi.' },
      { id: 'b_4', type: 'quote', content: 'Mùi hương là chiếc vé khứ hồi ngắn nhất đưa ta trở về với những miền ký ức bình yên.' },
      { id: 'b_5', type: 'tip', content: 'Hãy luôn để nến cháy đủ 1-2 giờ trong lần thắp đầu tiên để bề mặt sáp tan đều đến tận mép ly, tránh hiện tượng lõm tim nến.' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post) => {
    setEditingPost(post);
    setModalTab('blocks');
    setFormData({
      title: post.title || '',
      summary: post.summary || '',
      thumbnail: post.thumbnail || '',
      category: post.category || 'Nghệ Thuật Mùi Hương',
      author: post.author || 'Nghệ nhân Candlet',
      readTime: post.readTime || '5 phút đọc',
      isPublished: post.isPublished !== undefined ? post.isPublished : true,
      tags: post.tags?.length > 0 ? post.tags : ['Nến Thơm', 'Chánh Niệm'],
      customDesign: {
        themeColor: post.customDesign?.themeColor || '#4A2C2A',
        fontStyle: post.customDesign?.fontStyle || 'serif',
        layoutStyle: post.customDesign?.layoutStyle || 'editorial',
        quoteHighlight: post.customDesign?.quoteHighlight || '',
        authorRole: post.customDesign?.authorRole || 'Nghệ nhân chế tác nến & Chuyên gia khứu giác',
        ambientMood: post.customDesign?.ambientMood || 'Tiếng gỗ cháy lách tách trong lò sưởi',
        enableDropCap: post.customDesign?.enableDropCap !== undefined ? post.customDesign.enableDropCap : true,
        productPairing: {
          name: post.customDesign?.productPairing?.name || '',
          scentNotes: post.customDesign?.productPairing?.scentNotes || '',
          link: post.customDesign?.productPairing?.link || '/shop',
        },
      },
    });

    // Chuyển HTML của bài viết thành các khối trực quan
    const parsedBlocks = htmlToBlocks(post.content);
    setBlocks(parsedBlocks);
    setRawHtml(post.content || '');
    setIsModalOpen(true);
  };

  // BLOCK OPERATIONS
  const handleAddBlock = (type, afterIndex = -1) => {
    const newBlock = {
      id: `b_${Date.now()}`,
      type,
      content: '',
      ...(type === 'list' ? { items: ['Nốt hương đầu: ', 'Nốt hương giữa: ', 'Nốt hương cuối: '] } : {}),
      ...(type === 'image' ? { url: '', caption: '' } : {}),
      ...(type === 'callout' ? { title: 'Nến Thơm Gợi Ý', description: 'Trải nghiệm mùi hương hoàn hảo được nhắc đến trong câu chuyện.', link: '/shop' } : {}),
    };

    if (afterIndex >= 0) {
      const nextBlocks = [...blocks];
      nextBlocks.splice(afterIndex + 1, 0, newBlock);
      setBlocks(nextBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
  };

  const handleUpdateBlock = (id, field, value) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleUpdateListItem = (blockId, itemIndex, value) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        const newItems = [...b.items];
        newItems[itemIndex] = value;
        return { ...b, items: newItems };
      })
    );
  };

  const handleAddListItem = (blockId) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        return { ...b, items: [...(b.items || []), ''] };
      })
    );
  };

  const handleRemoveListItem = (blockId, itemIndex) => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        const newItems = b.items.filter((_, idx) => idx !== itemIndex);
        return { ...b, items: newItems.length > 0 ? newItems : [''] };
      })
    );
  };

  const handleDeleteBlock = (id) => {
    if (blocks.length === 1) {
      setBlocks([{ id: `b_${Date.now()}`, type: 'paragraph', content: '' }]);
      return;
    }
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleMoveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const nextBlocks = [...blocks];
    const temp = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIndex];
    nextBlocks[targetIndex] = temp;
    setBlocks(nextBlocks);
  };

  // TAG OPERATIONS
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tagToRemove) });
  };

  // SUBMIT FORM
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.summary) {
      showToast('Vui lòng điền tiêu đề và tóm tắt bài viết', 'error');
      return;
    }

    // Tự động biên dịch Khối trực quan thành HTML sạch đẹp
    const compiledContent = blocksToHtml(blocks);

    if (!compiledContent || compiledContent.trim() === '') {
      showToast('Nội dung bài viết không được để trống', 'error');
      return;
    }

    const payload = {
      ...formData,
      content: compiledContent,
    };

    try {
      setIsSubmitting(true);
      if (editingPost) {
        const res = await postService.updatePost(editingPost._id, payload);
        showToast(res.data?.message || 'Cập nhật bài viết thành công!');
      } else {
        const res = await postService.createPost(payload);
        showToast(res.data?.message || 'Đăng câu chuyện mới thành công!');
      }
      setIsModalOpen(false);
      fetchPosts();
    } catch (error) {
      showToast(error.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await postService.deletePost(id);
      showToast('Đã xóa câu chuyện thành công');
      setDeleteConfirm(null);
      fetchPosts();
    } catch (error) {
      showToast(error.response?.data?.message || 'Xóa bài viết thất bại', 'error');
    }
  };

  // Render xem trước HTML
  const previewHtml = blocksToHtml(blocks);

  return (
    <Layout>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-xl text-xs font-bold z-50 animate-in slide-in-from-bottom-5 duration-200 flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">delete_forever</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Xác nhận xóa câu chuyện</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Bạn có chắc muốn xóa vĩnh viễn bài viết <strong>"{deleteConfirm.title}"</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                onClick={() => setDeleteConfirm(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                onClick={() => handleDelete(deleteConfirm._id)}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Header Trang */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4A2C2A] text-28px">auto_stories</span>
              Quản lý Bài Viết & Câu Chuyện
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Đăng tải và tùy biến sâu giao diện các câu chuyện nến thơm, kỹ thuật thưởng hương và phong cách sống
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#4A2C2A] hover:bg-[#381B18] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Soạn Bài Viết Mới</span>
          </button>
        </div>

        {/* Thẻ Thống Kê Nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs">
            <span className="text-xs font-bold uppercase text-stone-400">Tổng số bài viết</span>
            <p className="text-2xl font-bold font-mono text-stone-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
            <span className="text-xs font-bold uppercase text-emerald-700">Đã xuất bản</span>
            <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">{stats.totalPublished}</p>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
            <span className="text-xs font-bold uppercase text-amber-700">Bản nháp / Đang ẩn</span>
            <p className="text-2xl font-bold font-mono text-amber-800 mt-1">{stats.totalDraft}</p>
          </div>
        </div>

        {/* Toolbar Lọc & Tìm Kiếm */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPosts();
              }}
              className="relative w-full sm:w-72"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bài viết theo tiêu đề..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#4A2C2A]"
              />
            </form>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#4A2C2A] bg-white text-stone-700"
            >
              <option value="">Tất cả danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#4A2C2A] bg-white text-stone-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đã xuất bản</option>
              <option value="false">Bản nháp (Ẩn)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchPosts}
            className="p-2 text-stone-500 hover:text-[#4A2C2A] rounded-lg border border-stone-200 hover:bg-stone-50 text-xs flex items-center gap-1 cursor-pointer"
            title="Tải lại"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>

        {/* Bảng Danh Sách Bài Viết */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50/80 text-stone-700 uppercase font-bold border-b border-stone-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Bài viết</th>
                  <th className="px-4 py-3.5">Danh mục</th>
                  <th className="px-4 py-3.5">Tác giả & Đọc</th>
                  <th className="px-4 py-3.5 text-center">Giao diện</th>
                  <th className="px-4 py-3.5 text-center">Xem & Tim</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-stone-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A2C2A] mb-2"></div>
                      <p>Đang tải bài viết...</p>
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-stone-400">
                      Chưa có bài viết nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const themeColor = post.customDesign?.themeColor || '#4A2C2A';
                    return (
                      <tr
                        key={post._id}
                        onClick={() => handleOpenEditModal(post)}
                        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                        title="Nhấp để chỉnh sửa bài viết"
                      >
                        {/* Cột Bài viết */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5 max-w-xs sm:max-w-sm">
                            <div className="w-14 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 group-hover:border-[#4A2C2A]/40 transition-colors">
                              {post.thumbnail ? (
                                <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-300">
                                  <span className="material-symbols-outlined text-lg">image</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-stone-900 truncate group-hover:text-[#4A2C2A] text-xs sm:text-sm transition-colors">
                                {post.title}
                              </h4>
                              <p className="text-[11px] text-stone-400 font-mono truncate">
                                /stories/{post.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cột Danh mục */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {post.category}
                          </span>
                        </td>

                        {/* Cột Tác giả */}
                        <td className="px-4 py-4 whitespace-nowrap text-xs">
                          <span className="font-semibold text-stone-800 block">{post.author}</span>
                          <span className="text-[11px] text-stone-400">{post.readTime}</span>
                        </td>

                        {/* Cột Giao diện */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-stone-50 border border-stone-200 text-[11px]">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: themeColor }}
                              title={`Màu nhấn: ${themeColor}`}
                            ></span>
                            <span className="font-mono text-[10px] text-stone-500 uppercase">
                              {post.customDesign?.fontStyle === 'sans' ? 'Sans' : 'Serif'}
                            </span>
                          </div>
                        </td>

                        {/* Cột Xem & Tim */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-3 text-xs justify-center">
                            <span className="inline-flex items-center gap-1 text-stone-600 font-mono font-medium" title="Lượt xem">
                              <span className="material-symbols-outlined text-[15px] text-stone-400">visibility</span>
                              {post.viewCount || 0}
                            </span>
                            <span className="inline-flex items-center gap-1 text-rose-600 font-mono font-medium" title="Lượt tim">
                              <span className="material-symbols-outlined text-[15px] text-rose-500">favorite</span>
                              {post.likesCount || 0}
                            </span>
                          </div>
                        </td>

                        {/* Cột Trạng thái */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {post.isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Xuất bản
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                              Bản nháp
                            </span>
                          )}
                        </td>

                        {/* Cột Thao tác */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Xem ngoài shop */}
                            <a
                              href={`/stories/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                              title="Xem bài viết trên shop"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </a>

                            {/* Xóa bài */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(post);
                              }}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Xóa bài viết"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ================= MODAL SOẠN THẢO KHỐI TRỰC QUAN (VISUAL NOTION-STYLE BUILDER) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl border border-stone-200 my-auto flex flex-col h-[94vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#381B18] text-amber-200 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-xl">
                    {editingPost ? 'edit_note' : 'draw'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {editingPost ? 'Chỉnh Sửa Câu Chuyện (Trực quan)' : 'Soạn Thảo Câu Chuyện Mới'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Soạn thảo theo khối nội dung phong cách Notion — Tự do sáng tạo, không cần gõ thẻ HTML
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center bg-stone-200/80 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTab('blocks')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'blocks' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">widgets</span>
                  <span>1. Soạn Thảo Khối</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('design')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'design' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>2. Tùy Biến Sâu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('preview')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'preview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>3. Xem Trước</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-xl cursor-pointer hidden sm:block"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 text-xs bg-stone-50/30">
              
              {/* TAB 1: SOẠN THẢO THEO KHỐI TRỰC QUAN (VISUAL BLOCK BUILDER) */}
              {modalTab === 'blocks' && (
                <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto">
                  
                  {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
                  <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider pb-2 border-b border-stone-100">
                      <span className="material-symbols-outlined text-base text-[#4A2C2A]">info</span>
                      <span>Thông Tin Tiêu Điểm</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-bold text-stone-700">Tiêu đề câu chuyện <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Ví dụ: Nghệ thuật thắp nến chánh niệm: Tìm lại bình yên trong từng nhịp thở..."
                          className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-stone-700">Chuyên mục <span className="text-red-500">*</span></label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-white font-medium"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tóm tắt ngắn */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Đoạn mở đầu / Tóm tắt cảm xúc (Lead) <span className="text-red-500">*</span></label>
                      <textarea
                        rows="2"
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        placeholder="Một vài câu văn mộc mạc dẫn dắt tâm trí người đọc vào bài viết..."
                        className="w-full px-4 py-2.5 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50 leading-relaxed font-serif-display text-sm italic"
                        required
                      />
                    </div>

                    {/* Thumbnail & Tác giả */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-stone-700">URL Ảnh Bìa</label>
                        <input
                          type="text"
                          value={formData.thumbnail}
                          onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-stone-700">Tác giả</label>
                        <input
                          type="text"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                          placeholder="Nghệ nhân Candlet"
                          className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-stone-700">Thời gian đọc</label>
                        <input
                          type="text"
                          value={formData.readTime}
                          onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                          placeholder="5 phút đọc"
                          className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PHẦN 2: BỘ SOẠN THẢO CÁC KHỐI NỘI DUNG (BLOCKS) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <div>
                        <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-700">dashboard_customize</span>
                          <span>Nội Dung Bài Viết (Soạn Thảo Trực Quan)</span>
                        </h4>
                        <p className="text-[11px] text-stone-500">Mỗi phần của bài viết là một khối riêng biệt, dễ dàng thêm, bớt hoặc sắp xếp lại thứ tự</p>
                      </div>

                      {/* Quick Add Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleAddBlock('paragraph')}
                          className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm đoạn văn thường"
                        >
                          <span className="material-symbols-outlined text-sm">segment</span>
                          <span>Đoạn văn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('heading2')}
                          className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm tiêu đề mục lớn"
                        >
                          <span className="material-symbols-outlined text-sm">format_h2</span>
                          <span>Mục lớn (H2)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('heading3')}
                          className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm tiêu đề nhánh nhỏ"
                        >
                          <span className="material-symbols-outlined text-sm">format_h3</span>
                          <span>Mục nhỏ (H3)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('quote')}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm câu trích dẫn nghệ thuật"
                        >
                          <span className="material-symbols-outlined text-sm">format_quote</span>
                          <span>Trích dẫn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('tip')}
                          className="px-2.5 py-1 rounded-xl bg-amber-100/70 hover:bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm hộp mẹo nến từ nghệ nhân"
                        >
                          <span className="material-symbols-outlined text-sm">lightbulb</span>
                          <span>Mẹo nến</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('list')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Thêm danh sách các nốt hương / gạch đầu dòng"
                        >
                          <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                          <span>Nốt hương / Ý</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('image')}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Chèn ảnh minh họa"
                        >
                          <span className="material-symbols-outlined text-sm">image</span>
                          <span>Hình ảnh</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('callout')}
                          className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Gợi ý sản phẩm nến ghép đôi"
                        >
                          <span className="material-symbols-outlined text-sm">shopping_bag</span>
                          <span>Gợi ý nến</span>
                        </button>
                      </div>
                    </div>

                    {/* DANH SÁCH CÁC KHỐI ĐƯỢC HIỂN THỊ */}
                    <div className="space-y-3.5">
                      {blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs hover:shadow-xs transition-all relative group"
                        >
                          {/* Block Header Toolbar */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 text-stone-400">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-stone-300">
                                #{index + 1}
                              </span>

                              {/* Block Badge */}
                              {block.type === 'paragraph' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                                  <span className="material-symbols-outlined text-xs">segment</span>
                                  Đoạn văn thường
                                </span>
                              )}
                              {block.type === 'heading2' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <span className="material-symbols-outlined text-xs">format_h2</span>
                                  Tiêu đề mục lớn (H2)
                                </span>
                              )}
                              {block.type === 'heading3' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                  <span className="material-symbols-outlined text-xs">format_h3</span>
                                  Tiêu đề mục nhỏ (H3)
                                </span>
                              )}
                              {block.type === 'quote' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  <span className="material-symbols-outlined text-xs">format_quote</span>
                                  Trích dẫn thơ mộng
                                </span>
                              )}
                              {block.type === 'tip' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300">
                                  <span className="material-symbols-outlined text-xs">lightbulb</span>
                                  Mẹo nến nghệ nhân
                                </span>
                              )}
                              {block.type === 'list' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <span className="material-symbols-outlined text-xs">format_list_bulleted</span>
                                  Nốt hương / Danh sách ý
                                </span>
                              )}
                              {block.type === 'image' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  <span className="material-symbols-outlined text-xs">image</span>
                                  Hình ảnh minh họa
                                </span>
                              )}
                              {block.type === 'callout' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  <span className="material-symbols-outlined text-xs">shopping_bag</span>
                                  Gợi ý nến thơm đi kèm
                                </span>
                              )}
                            </div>

                            {/* Move and Delete controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, -1)}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                                title="Di chuyển lên"
                              >
                                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, 1)}
                                disabled={index === blocks.length - 1}
                                className="p-1 rounded hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 cursor-pointer"
                                title="Di chuyển xuống"
                              >
                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                className="p-1 rounded hover:bg-red-50 hover:text-red-600 cursor-pointer ml-1"
                                title="Xóa khối này"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Block Body Inputs */}
                          <div className="space-y-2">
                            
                            {/* KHỐI ĐOẠN VĂN */}
                            {block.type === 'paragraph' && (
                              <textarea
                                rows="3"
                                value={block.content}
                                onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)}
                                placeholder="Nhập nội dung đoạn văn tại đây..."
                                className="w-full p-2.5 text-xs text-stone-800 leading-relaxed border border-stone-200/80 rounded-xl focus:outline-none focus:border-[#4A2C2A] bg-stone-50/30"
                              />
                            )}

                            {/* KHỐI TIÊU ĐỀ H2 */}
                            {block.type === 'heading2' && (
                              <input
                                type="text"
                                value={block.content}
                                onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)}
                                placeholder="Nhập tiêu đề phân đoạn lớn (H2)..."
                                className="w-full p-3 font-serif-display text-base font-bold text-[#2A1412] border border-amber-200/80 rounded-xl focus:outline-none focus:border-amber-700 bg-amber-50/20"
                              />
                            )}

                            {/* KHỐI TIÊU ĐỀ H3 */}
                            {block.type === 'heading3' && (
                              <input
                                type="text"
                                value={block.content}
                                onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)}
                                placeholder="Nhập tiêu đề phân đoạn nhỏ (H3)..."
                                className="w-full p-2.5 font-serif-display text-sm font-bold text-stone-800 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-700 bg-stone-50/40"
                              />
                            )}

                            {/* KHỐI TRÍCH DẪN */}
                            {block.type === 'quote' && (
                              <div className="p-3.5 rounded-xl bg-rose-50/40 border-l-4 border-rose-400 space-y-1.5">
                                <textarea
                                  rows="2"
                                  value={block.content}
                                  onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)}
                                  placeholder="Nhập câu danh ngôn hoặc triết lý mùi hương..."
                                  className="w-full p-2 font-serif-display text-sm italic text-stone-800 border border-rose-200/60 rounded-lg focus:outline-none focus:border-rose-400 bg-white"
                                />
                              </div>
                            )}

                            {/* KHỐI MẸO NẾN */}
                            {block.type === 'tip' && (
                              <div className="p-3.5 rounded-xl bg-amber-50 border-l-4 border-amber-500 space-y-1.5">
                                <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                                  <span>💡 Lời khuyên từ nghệ nhân Candlet:</span>
                                </span>
                                <textarea
                                  rows="2"
                                  value={block.content}
                                  onChange={(e) => handleUpdateBlock(block.id, 'content', e.target.value)}
                                  placeholder="Ví dụ: Cắt bấc còn 0.5cm trước mỗi lần đốt để bấc cháy đều không sinh khói..."
                                  className="w-full p-2 text-xs text-stone-800 border border-amber-300/80 rounded-lg focus:outline-none focus:border-amber-600 bg-white"
                                />
                              </div>
                            )}

                            {/* KHỐI DANH SÁCH Ý / NỐT HƯƠNG */}
                            {block.type === 'list' && (
                              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-2">
                                <div className="space-y-1.5">
                                  {(block.items || []).map((item, itemIdx) => (
                                    <div key={itemIdx} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                                      <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => handleUpdateListItem(block.id, itemIdx, e.target.value)}
                                        placeholder={`Ý thứ ${itemIdx + 1}...`}
                                        className="flex-1 p-2 text-xs border border-emerald-200/80 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveListItem(block.id, itemIdx)}
                                        className="text-stone-400 hover:text-red-500 p-1 cursor-pointer"
                                        title="Xóa ý này"
                                      >
                                        <span className="material-symbols-outlined text-base">close</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddListItem(block.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline pt-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">add</span>
                                  <span>Thêm ý / nốt hương</span>
                                </button>
                              </div>
                            )}

                            {/* KHỐI HÌNH ẢNH */}
                            {block.type === 'image' && (
                              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-600">Đường dẫn ảnh (URL):</label>
                                    <input
                                      type="text"
                                      value={block.url}
                                      onChange={(e) => handleUpdateBlock(block.id, 'url', e.target.value)}
                                      placeholder="https://images.unsplash.com/..."
                                      className="w-full p-2 text-xs border border-blue-200/80 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-600">Chú thích chân ảnh:</label>
                                    <input
                                      type="text"
                                      value={block.caption}
                                      onChange={(e) => handleUpdateBlock(block.id, 'caption', e.target.value)}
                                      placeholder="— Góc làm việc bên ánh nến —"
                                      className="w-full p-2 text-xs border border-blue-200/80 rounded-lg focus:outline-none focus:border-blue-500 bg-white italic"
                                    />
                                  </div>
                                </div>

                                {block.url && (
                                  <div className="mt-2 rounded-xl overflow-hidden aspect-[21/9] max-h-44 bg-stone-100 border border-stone-200">
                                    <img src={block.url} alt={block.caption || 'Preview'} className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* KHỐI GỢI Ý NẾN THƠM */}
                            {block.type === 'callout' && (
                              <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-600">Tên sản phẩm nến gợi ý:</label>
                                    <input
                                      type="text"
                                      value={block.title}
                                      onChange={(e) => handleUpdateBlock(block.id, 'title', e.target.value)}
                                      placeholder="Ví dụ: Nến Ly Hổ Phách 'Love Whisper'"
                                      className="w-full p-2 text-xs font-bold border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-600">Đường dẫn sản phẩm:</label>
                                    <input
                                      type="text"
                                      value={block.link}
                                      onChange={(e) => handleUpdateBlock(block.id, 'link', e.target.value)}
                                      placeholder="/shop hoặc link chi tiết"
                                      className="w-full p-2 text-xs border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-white"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-600">Mô tả lý do ghép đôi mùi hương:</label>
                                  <textarea
                                    rows="2"
                                    value={block.description}
                                    onChange={(e) => handleUpdateBlock(block.id, 'description', e.target.value)}
                                    placeholder="Giải thích vì sao mùi hương này phù hợp với nội dung bài viết..."
                                    className="w-full p-2 text-xs border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-white"
                                  />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Add Block Bar */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleAddBlock('paragraph')}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-dashed border-stone-300 hover:border-[#4A2C2A] text-stone-600 hover:text-[#4A2C2A] font-bold text-xs transition-colors bg-white cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        <span>Thêm một đoạn văn mới</span>
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: TÙY BIẾN SÂU (DEEP CUSTOMIZATION) */}
              {modalTab === 'design' && (
                <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto">
                  <div className="p-7 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-6">
                    
                    <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">tune</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">Tùy Chỉnh Sâu Phong Cách Bài Viết</h4>
                        <p className="text-[11px] text-stone-500">Thiết lập linh hồn, màu sắc, âm hưởng và thông tin định danh cho câu chuyện</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* 1. MÀU ĐIỂM NHẤN */}
                      <div className="space-y-3 bg-stone-50/60 p-5 rounded-2xl border border-stone-200/70">
                        <label className="font-bold text-stone-800 block text-xs">
                          Màu sắc tâm trạng (Theme Color)
                        </label>
                        <p className="text-[11px] text-stone-500">Màu này sẽ áp dụng cho nhãn chuyên mục, thanh tiến trình đọc, viền trích dẫn và các nút nhấn.</p>
                        
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="color"
                            value={formData.customDesign.themeColor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customDesign: { ...formData.customDesign, themeColor: e.target.value },
                              })
                            }
                            className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5 shadow-xs"
                          />
                          <input
                            type="text"
                            value={formData.customDesign.themeColor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customDesign: { ...formData.customDesign, themeColor: e.target.value },
                              })
                            }
                            className="w-28 px-3 py-2 text-xs font-mono uppercase font-bold border border-stone-200 rounded-lg bg-white"
                          />
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-stone-400 font-bold uppercase block mb-2">Màu sáp nghệ thuật có sẵn:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    customDesign: { ...formData.customDesign, themeColor: c.hex },
                                  })
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                  formData.customDesign.themeColor.toLowerCase() === c.hex.toLowerCase()
                                    ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                                <span>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 2. TYPOGRAPHY & DROP CAP */}
                      <div className="space-y-4 bg-stone-50/60 p-5 rounded-2xl border border-stone-200/70">
                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-800 block text-xs">
                            Kiểu phông chữ tiêu đề
                          </label>
                          <select
                            value={formData.customDesign.fontStyle}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customDesign: { ...formData.customDesign, fontStyle: e.target.value },
                              })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-stone-200 rounded-xl bg-white font-medium"
                          >
                            <option value="serif">Serif (Cổ điển & Lãng mạn - Cormorant Garamond)</option>
                            <option value="sans">Sans-serif (Hiện đại & Tối giản - Plus Jakarta Sans)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-stone-800 block text-xs">
                            Bố cục trình bày (Layout Style)
                          </label>
                          <select
                            value={formData.customDesign.layoutStyle}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customDesign: { ...formData.customDesign, layoutStyle: e.target.value },
                              })
                            }
                            className="w-full px-3.5 py-2.5 text-xs border border-stone-200 rounded-xl bg-white font-medium"
                          >
                            <option value="editorial">Editorial (Tạp chí tiêu chuẩn)</option>
                            <option value="minimal">Minimal (Tối giản thanh thoát)</option>
                          </select>
                        </div>

                        {/* Drop Cap Toggle */}
                        <div className="pt-2">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.customDesign.enableDropCap}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  customDesign: { ...formData.customDesign, enableDropCap: e.target.checked },
                                })
                              }
                              className="w-4 h-4 text-[#4A2C2A] rounded border-stone-300 focus:ring-[#4A2C2A]"
                            />
                            <div>
                              <span className="font-bold text-stone-800 text-xs block">Hiệu ứng Drop Cap (Chữ cái đầu to bản)</span>
                              <span className="text-[10px] text-stone-500">Chữ cái đầu tiên của bài viết phóng to theo phong cách tạp chí quý tộc</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* 3. ÂM HƯỞNG KHÔNG GIAN (AMBIENT SOUND) */}
                      <div className="space-y-3 bg-stone-50/60 p-5 rounded-2xl border border-stone-200/70">
                        <label className="font-bold text-stone-800 block text-xs flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-amber-700">headphones</span>
                          <span>Gợi ý âm thanh / Giai điệu khi đọc bài</span>
                        </label>
                        <p className="text-[11px] text-stone-500">Hiển thị một badge âm hưởng thư giãn trên đầu bài viết để tạo không gian thưởng thức nến.</p>

                        <input
                          type="text"
                          value={formData.customDesign.ambientMood}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customDesign: { ...formData.customDesign, ambientMood: e.target.value },
                            })
                          }
                          placeholder="Ví dụ: Tiếng mưa rơi tí tách bên thềm cửa..."
                          className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-[#4A2C2A]"
                        />

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {AMBIENT_MOOD_SUGGESTIONS.map((mood) => (
                            <button
                              key={mood}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  customDesign: { ...formData.customDesign, ambientMood: mood },
                                })
                              }
                              className="text-[10px] px-2 py-1 rounded-md bg-white border border-stone-200 hover:border-amber-400 text-stone-600 hover:text-stone-900 cursor-pointer transition-colors"
                            >
                              + {mood}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. ĐỊNH DANH NGHỆ NHÂN (AUTHOR ROLE) */}
                      <div className="space-y-3 bg-stone-50/60 p-5 rounded-2xl border border-stone-200/70">
                        <label className="font-bold text-stone-800 block text-xs">
                          Chức danh nghệ nhân tác giả
                        </label>
                        <p className="text-[11px] text-stone-500">Hiển thị trên tấm bưu thiếp tác giả ở cuối bài viết.</p>

                        <input
                          type="text"
                          value={formData.customDesign.authorRole}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customDesign: { ...formData.customDesign, authorRole: e.target.value },
                            })
                          }
                          placeholder="Ví dụ: Nghệ nhân nến thơm & Chuyên gia khứu giác..."
                          className="w-full px-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-[#4A2C2A]"
                        />

                        {/* Quote Highlight */}
                        <div className="pt-2 space-y-1.5">
                          <label className="font-bold text-stone-800 block text-xs">
                            Khối danh ngôn tâm đắc (Quote Highlight Banner)
                          </label>
                          <input
                            type="text"
                            value={formData.customDesign.quoteHighlight}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customDesign: { ...formData.customDesign, quoteHighlight: e.target.value },
                              })
                            }
                            placeholder="Một câu trích dẫn nổi bật to bản trong bài..."
                            className="w-full px-3.5 py-2 text-xs font-serif-display text-sm italic border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-[#4A2C2A]"
                          />
                        </div>
                      </div>

                    </div>

                    {/* 5. THẺ TỪ KHÓA (TAGS) */}
                    <div className="p-5 rounded-2xl bg-stone-50/60 border border-stone-200/70 space-y-3">
                      <label className="font-bold text-stone-800 block text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-stone-600">tag</span>
                        <span>Thẻ chủ đề bài viết (Tags)</span>
                      </label>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-stone-300 text-stone-700 font-bold text-[11px] shadow-2xs"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-stone-400 hover:text-red-500 cursor-pointer ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}

                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Nhập tag rồi ấn Enter..."
                            className="px-3 py-1 text-xs border border-stone-200 rounded-full bg-white focus:outline-none focus:border-[#4A2C2A]"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-3 py-1 bg-stone-800 text-white rounded-full text-xs font-bold hover:bg-stone-700 cursor-pointer"
                          >
                            + Thêm
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW) */}
              {modalTab === 'preview' && (
                <div className="p-6 sm:p-10 rounded-3xl bg-[#FAF7F2] border border-stone-200 space-y-6 max-w-3xl mx-auto shadow-inner animate-in fade-in duration-150">
                  <div className="text-center space-y-3 pb-6 border-b border-stone-200">
                    <span
                      className="inline-block text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-xs"
                      style={{ backgroundColor: formData.customDesign.themeColor }}
                    >
                      {formData.category}
                    </span>
                    <h2
                      className={`text-2xl sm:text-4xl font-bold text-[#2A1412] leading-snug ${
                        formData.customDesign.fontStyle !== 'sans' ? 'font-serif-display' : ''
                      }`}
                    >
                      {formData.title || 'Tiêu đề câu chuyện'}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 font-serif-display italic max-w-xl mx-auto">
                      "{formData.summary || 'Tóm tắt bài viết...'}"
                    </p>
                    <div className="text-[11px] text-stone-400">
                      Bởi <strong>{formData.author}</strong> ({formData.customDesign.authorRole}) • {formData.readTime}
                    </div>

                    {formData.customDesign.ambientMood && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/60 text-amber-900 text-[10px] font-bold">
                        <span className="material-symbols-outlined text-xs">headphones</span>
                        <span>Âm hưởng gợi ý: {formData.customDesign.ambientMood}</span>
                      </div>
                    )}
                  </div>

                  {formData.thumbnail && (
                    <div className="rounded-2xl overflow-hidden aspect-[16/9] shadow-sm">
                      <img src={formData.thumbnail} alt="Preview thumbnail" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {formData.customDesign.quoteHighlight && (
                    <div
                      className="p-6 rounded-2xl bg-white shadow-2xs border-l-4"
                      style={{ borderColor: formData.customDesign.themeColor }}
                    >
                      <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Thông điệp cốt lõi</p>
                      <blockquote className="font-serif-display italic text-lg sm:text-xl text-[#2C1810]">
                        "{formData.customDesign.quoteHighlight}"
                      </blockquote>
                    </div>
                  )}

                  {/* Render content */}
                  <div
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-stone-400 italic text-center">Nội dung sẽ hiển thị tại đây...</p>' }}
                    className="prose prose-stone max-w-none text-xs sm:text-sm leading-relaxed space-y-4 [&>h2]:font-serif-display [&>h2]:text-2xl [&>h2]:font-bold [&>blockquote]:italic [&>blockquote]:border-l-4 [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:bg-white [&>.candle-tip]:bg-amber-50 [&>.candle-tip]:p-4 [&>.candle-tip]:rounded-xl [&>.candle-tip]:border-l-4 [&>.candle-tip]:border-amber-500 [&>figure>img]:rounded-2xl [&>figure>img]:my-3"
                  />

                  {/* Tags Preview */}
                  {formData.tags.length > 0 && (
                    <div className="pt-6 border-t border-stone-200 flex flex-wrap gap-1.5">
                      {formData.tags.map((tag) => (
                        <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-200/60 text-stone-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Trạng thái xuất bản */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#4A2C2A] rounded border-stone-300 focus:ring-[#4A2C2A]"
                  />
                  <span className="font-bold text-stone-800 text-xs">
                    Xuất bản công khai bài viết này ra ngoài Cửa hàng
                  </span>
                </label>
                <span className="text-[11px] text-stone-400 hidden sm:inline">
                  {formData.isPublished ? 'Độc giả có thể đọc bài viết này ngay' : 'Đang lưu dưới dạng bản nháp nội bộ'}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors cursor-pointer text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-[#381B18] hover:bg-[#200E0C] text-amber-100 font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>{editingPost ? 'Lưu Thay Đổi' : 'Đăng Câu Chuyện'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
