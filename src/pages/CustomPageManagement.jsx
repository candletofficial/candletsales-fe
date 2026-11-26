import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import systemConfigService from '../services/systemConfigService';
import {
  CUSTOM_PAGE_CONFIG_KEY, defaultCustomPageConfig, mergeCustomPageConfig,
} from './shop/customPageConfig';

const clone = value => JSON.parse(JSON.stringify(value));

const tabs = [
  ['general', 'Nội dung & liên hệ', 'contact_page', 'Tiêu đề, mô tả và kênh tư vấn'],
  ['products', 'Cốc, nắp & mẫu', 'coffee_maker', 'Danh mục và hình ảnh sản phẩm'],
  ['scents', 'Mùi hương', 'spa', 'Mã mùi và ba tầng hương'],
  ['pricing', 'Bảng giá', 'payments', 'Mức giá theo số lượng'],
  ['policies', 'Quy trình & chính sách', 'fact_check', 'Các bước và điều khoản đặt hàng'],
];

const copySections = [
  ['configure', 'Nội dung phần lựa chọn cấu hình', [
    ['eyebrow', 'Nhãn nhỏ'], ['title', 'Tiêu đề'], ['description', 'Mô tả', true], ['sample', 'Mẫu nội dung gửi Candlet', true],
    ['cupTitle', 'Tiêu đề chọn cốc'], ['cupDescription', 'Mô tả chọn cốc', true], ['lidTitle', 'Tiêu đề chọn nắp'], ['lidDescription', 'Mô tả chọn nắp', true],
    ['scentTitle', 'Tiêu đề chọn mùi'], ['scentDescription', 'Mô tả chọn mùi', true], ['otherColorTitle', 'Tiêu đề màu riêng'], ['otherColorDescription', 'Mô tả màu riêng', true],
  ]],
  ['packaging', 'Nội dung nhãn và bao bì', [['title', 'Tiêu đề'], ['description', 'Mô tả', true], ['note', 'Ghi chú', true]]],
  ['pricing', 'Nội dung phần bảng giá', [['eyebrow', 'Nhãn nhỏ'], ['title', 'Tiêu đề'], ['description', 'Mô tả', true], ['note', 'Ghi chú dưới bảng giá', true]]],
  ['shaped', 'Nội dung phần nến tạo hình', [['eyebrow', 'Nhãn nhỏ'], ['title', 'Tiêu đề'], ['description', 'Mô tả', true], ['note', 'Ghi chú dưới bảng giá', true]]],
  ['process', 'Nội dung phần quy trình', [['eyebrow', 'Nhãn nhỏ'], ['title', 'Tiêu đề'], ['description', 'Mô tả', true]]],
  ['policyIntro', 'Nội dung mở đầu chính sách', [['eyebrow', 'Nhãn nhỏ'], ['title', 'Tiêu đề'], ['description', 'Mô tả', true]]],
];

function Field({ label, value, onChange, multiline = false, hint, type = 'text' }) {
  const Component = multiline ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-extrabold text-on-surface">{label}</span>
      <Component
        type={multiline ? undefined : type}
        value={value || ''}
        rows={multiline ? 3 : undefined}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-[13px] leading-5 text-on-surface outline-none transition placeholder:text-on-surface-variant/50 hover:border-primary/30 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
      />
      {hint && <span className="mt-1 block text-[10px] text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function Section({ title, description, children, icon, collapsible = false }) {
  const content = (
    <>
      <div className="mb-5 flex items-start gap-3 border-b border-outline-variant/60 pb-4">
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-container text-primary"><span className="material-symbols-outlined text-[19px]">{icon}</span></span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-on-surface">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>}
        </div>
        {collapsible && <span className="material-symbols-outlined mt-1 text-[19px] text-on-surface-variant transition group-open:rotate-180">expand_more</span>}
      </div>
      {children}
    </>
  );
  if (collapsible) {
    return <details className="group rounded-2xl border border-outline-variant bg-white p-4 shadow-[0_1px_2px_rgba(44,24,16,.04)] open:shadow-sm sm:p-5"><summary className="cursor-pointer list-none [&+*]:mt-0">{content.props.children[0]}</summary><div>{children}</div></details>;
  }
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-[0_1px_2px_rgba(44,24,16,.04)] sm:p-6">{content}</section>
  );
}

function ArrayEditor({ rows, columns, onChange, addLabel = 'Thêm dòng' }) {
  const [query, setQuery] = useState('');
  const updateCell = (rowIndex, columnIndex, value) => {
    const next = rows.map((row, index) => index === rowIndex
      ? row.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell)
      : row);
    onChange(next);
  };

  const removeRow = index => onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  const moveRow = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !query || row.join(' ').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));

  const cellInput = (row, rowIndex, column, columnIndex, compact = false) => {
    const isImage = column.label.toLocaleLowerCase('vi').includes('ảnh');
    const Component = column.multiline && !compact ? 'textarea' : 'input';
    return (
      <div className={isImage ? 'flex items-center gap-2' : ''}>
        {isImage && row[columnIndex] && <img src={row[columnIndex]} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant bg-white object-contain p-1" />}
        <Component
          value={row[columnIndex] || ''}
          rows={column.multiline ? 2 : undefined}
          onChange={event => updateCell(rowIndex, columnIndex, event.target.value)}
          className={`${isImage ? 'min-w-[220px] flex-1' : column.multiline ? 'min-w-[220px]' : 'min-w-[120px]'} w-full rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-xs leading-5 text-on-surface outline-none transition hover:border-outline-variant hover:bg-white focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10`}
        />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant"><span className="rounded-lg bg-primary-container px-2.5 py-1.5 text-primary">{rows.length} mục</span><span>Nhấp vào ô để chỉnh sửa trực tiếp</span></div>
        {rows.length > 6 && <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 sm:w-64"><span className="material-symbols-outlined text-[17px] text-on-surface-variant">search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm trong danh sách..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" />{query && <button type="button" onClick={() => setQuery('')} className="text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">close</span></button>}</label>}
      </div>

      <div className="space-y-3 md:hidden">
        {visibleRows.map(({ row, index: rowIndex }) => (
          <div key={`${rowIndex}-${row[0]}`} className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {columns.map((column, columnIndex) => (
                <Field
                  key={column.label}
                  label={column.label}
                  multiline={column.multiline}
                  value={row[columnIndex]}
                  onChange={value => updateCell(rowIndex, columnIndex, value)}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-1 border-t border-outline-variant/60 pt-2">
              <button type="button" onClick={() => moveRow(rowIndex, -1)} disabled={rowIndex === 0} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-white disabled:opacity-25"><span className="material-symbols-outlined text-[17px]">arrow_upward</span></button>
              <button type="button" onClick={() => moveRow(rowIndex, 1)} disabled={rowIndex === rows.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-white disabled:opacity-25"><span className="material-symbols-outlined text-[17px]">arrow_downward</span></button>
              <button type="button" onClick={() => removeRow(rowIndex)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><span className="material-symbols-outlined text-[17px]">delete</span></button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-outline-variant md:block">
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-surface-container shadow-[0_1px_0_var(--color-outline-variant)]">
              <tr>{columns.map(column => <th key={column.label} className="whitespace-nowrap px-3 py-3 text-[10px] font-black uppercase tracking-[.08em] text-on-surface-variant">{column.label}</th>)}<th className="sticky right-0 w-28 bg-surface-container px-3 py-3 text-right text-[10px] font-black uppercase tracking-[.08em] text-on-surface-variant">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {visibleRows.map(({ row, index: rowIndex }) => <tr key={`${rowIndex}-${row[0]}`} className="bg-white hover:bg-primary-container/10">
                {columns.map((column, columnIndex) => <td key={column.label} className="p-1.5 align-top">{cellInput(row, rowIndex, column, columnIndex, true)}</td>)}
                <td className="sticky right-0 bg-inherit p-2 align-middle"><div className="flex justify-end gap-0.5"><button type="button" title="Đưa lên" onClick={() => moveRow(rowIndex, -1)} disabled={rowIndex === 0 || Boolean(query)} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-white disabled:opacity-20"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button><button type="button" title="Đưa xuống" onClick={() => moveRow(rowIndex, 1)} disabled={rowIndex === rows.length - 1 || Boolean(query)} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-white disabled:opacity-20"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button><button type="button" title="Xóa" onClick={() => removeRow(rowIndex)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><span className="material-symbols-outlined text-[16px]">delete</span></button></div></td>
              </tr>)}
            </tbody>
          </table>
          {visibleRows.length === 0 && <div className="grid min-h-32 place-items-center bg-white text-xs text-on-surface-variant">Không tìm thấy dữ liệu phù hợp</div>}
        </div>
      </div>

      <button type="button" onClick={() => { onChange([...rows, columns.map(() => '')]); setQuery(''); }} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-container/20 px-4 text-xs font-bold text-primary transition hover:bg-primary-container/60">
        <span className="material-symbols-outlined text-[18px]">add</span>{addLabel}
      </button>
    </div>
  );
}

export default function CustomPageManagement() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState(() => clone(defaultCustomPageConfig));
  const [savedConfig, setSavedConfig] = useState(() => clone(defaultCustomPageConfig));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    systemConfigService.getConfig(CUSTOM_PAGE_CONFIG_KEY)
      .then(response => {
        const value = mergeCustomPageConfig(response?.data?.value);
        setConfig(value);
        setSavedConfig(clone(value));
      })
      .catch(error => setNotice({ type: 'error', text: error.response?.data?.message || 'Không thể tải cấu hình. Đang hiển thị dữ liệu mặc định.' }))
      .finally(() => setLoading(false));
  }, []);

  const setGroup = (group, key, value) => setConfig(current => ({
    ...current,
    [group]: { ...current[group], [key]: value },
  }));
  const setList = (key, value) => setConfig(current => ({ ...current, [key]: value }));
  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  useEffect(() => {
    const warnBeforeLeaving = event => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasChanges]);

  const save = async () => {
    try {
      setSaving(true);
      setNotice(null);
      await systemConfigService.updateConfig(CUSTOM_PAGE_CONFIG_KEY, config);
      setSavedConfig(clone(config));
      setNotice({ type: 'success', text: 'Đã cập nhật trang custom. Khách tải lại trang sẽ thấy dữ liệu mới.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Không thể lưu cấu hình trang custom.' });
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = tabs.find(([id]) => id === activeTab) || tabs[0];
  const totalProducts = config.cups.length + config.lids.length + config.shapedCandles.length;

  return (
    <Layout>
      <div className="mx-auto max-w-[1560px] p-3 sm:p-5 lg:p-7">
        <header className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary px-5 py-6 text-white shadow-lg shadow-primary/10 sm:px-7 lg:px-9 lg:py-8">
          <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[48px] border-white/[.05]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/60"><span className="material-symbols-outlined text-[17px]">edit_note</span>Nội dung website</div>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">Quản lý trang Custom</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-white/70 sm:text-sm">Cập nhật toàn bộ nội dung trang nến custom tại một nơi. Dữ liệu mới được áp dụng ngay sau khi lưu.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold"><b className="text-white">{totalProducts}</b> mẫu sản phẩm</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold"><b className="text-white">{config.scents.length}</b> mùi hương</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold"><b className="text-white">{config.policies.length}</b> chính sách</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/custom-candles" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur hover:bg-white/15"><span className="material-symbols-outlined text-[18px]">open_in_new</span>Xem trang</a>
              <button type="button" onClick={save} disabled={saving || loading || !hasChanges} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : hasChanges ? 'save' : 'check'}</span>{saving ? 'Đang lưu...' : hasChanges ? 'Lưu thay đổi' : 'Đã lưu'}</button>
            </div>
          </div>
        </header>

        {notice && <div className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><span className="material-symbols-outlined text-[19px]">{notice.type === 'success' ? 'check_circle' : 'error'}</span>{notice.text}</div>}

        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start">
          <aside className="xl:sticky xl:top-5">
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant bg-white p-2 shadow-sm xl:flex-col xl:overflow-visible xl:p-3">
              {tabs.map(([id, label, icon, description]) => <button type="button" key={id} onClick={() => setActiveTab(id)} className={`group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left transition xl:min-w-0 ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface hover:bg-surface-container-low'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activeTab === id ? 'bg-white/15 text-white' : 'bg-primary-container text-primary'}`}><span className="material-symbols-outlined text-[19px]">{icon}</span></span><span className="min-w-0"><span className="block text-xs font-black">{label}</span><span className={`mt-0.5 hidden truncate text-[9px] xl:block ${activeTab === id ? 'text-white/60' : 'text-on-surface-variant'}`}>{description}</span></span></button>)}
            </nav>
            <div className="mt-3 hidden rounded-2xl border border-outline-variant bg-white p-4 xl:block">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${hasChanges ? 'bg-amber-500' : 'bg-emerald-500'}`} /><p className="text-xs font-black text-on-surface">{hasChanges ? 'Có thay đổi chưa lưu' : 'Dữ liệu đã được lưu'}</p></div>
              <p className="mt-2 text-[10px] leading-4 text-on-surface-variant">{hasChanges ? 'Hãy lưu trước khi rời trang để tránh mất nội dung vừa chỉnh sửa.' : 'Bạn có thể tiếp tục chỉnh sửa hoặc mở trang khách để kiểm tra.'}</p>
              {hasChanges && <button type="button" onClick={() => setConfig(clone(savedConfig))} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"><span className="material-symbols-outlined text-[15px]">undo</span>Hoàn tác thay đổi</button>}
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-container text-primary"><span className="material-symbols-outlined text-[19px]">{activeMeta[2]}</span></span><div className="min-w-0"><h2 className="truncate text-sm font-black text-on-surface">{activeMeta[1]}</h2><p className="mt-0.5 truncate text-[10px] text-on-surface-variant">{activeMeta[3]}</p></div></div>
              {hasChanges && <span className="ml-3 shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">CHƯA LƯU</span>}
            </div>

            {loading ? <div className="grid min-h-72 place-items-center rounded-2xl border border-outline-variant bg-white"><div className="text-center"><span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span><p className="mt-2 text-xs text-on-surface-variant">Đang tải dữ liệu trang custom...</p></div></div> : <div className="space-y-5">
          {activeTab === 'general' && <>
            <Section icon="forum" title="Kênh liên hệ" description="Các nút Zalo và Facebook trên trang sẽ dùng trực tiếp thông tin này.">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Số điện thoại Zalo" value={config.contact.zaloPhone} onChange={value => setGroup('contact', 'zaloPhone', value)} hint="Chỉ nhập số, ví dụ 0328624761" />
                <Field label="Link Zalo" value={config.contact.zaloUrl} onChange={value => setGroup('contact', 'zaloUrl', value)} hint="Ví dụ https://zalo.me/0328624761" />
                <Field label="Link Fanpage" value={config.contact.fanpageUrl} onChange={value => setGroup('contact', 'fanpageUrl', value)} />
              </div>
            </Section>
            <Section icon="web_asset" title="Phần mở đầu">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nhãn nhỏ" value={config.hero.eyebrow} onChange={value => setGroup('hero', 'eyebrow', value)} />
                <Field label="Tiêu đề" value={config.hero.title} onChange={value => setGroup('hero', 'title', value)} />
                <div className="md:col-span-2"><Field multiline label="Mô tả" value={config.hero.description} onChange={value => setGroup('hero', 'description', value)} /></div>
              </div>
            </Section>
            <Section icon="groups" title="Nhóm khách hàng" description="Ba thẻ giới thiệu ngay dưới phần mở đầu.">
              <ArrayEditor rows={config.introCards} columns={[{ label: 'Tên icon Phosphor' }, { label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('introCards', value)} addLabel="Thêm nhóm" />
            </Section>
            {copySections.map(([group, title, fields]) => (
              <Section key={group} title={title} collapsible>
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map(([key, label, multiline]) => <div key={key} className={multiline ? 'md:col-span-2' : ''}><Field multiline={multiline} label={label} value={config[group][key]} onChange={value => setGroup(group, key, value)} /></div>)}
                </div>
              </Section>
            ))}
            <Section icon="campaign" title="Lời kêu gọi cuối trang">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nhãn nhỏ" value={config.cta.eyebrow} onChange={value => setGroup('cta', 'eyebrow', value)} />
                <Field label="Tiêu đề" value={config.cta.title} onChange={value => setGroup('cta', 'title', value)} />
                <div className="md:col-span-2"><Field multiline label="Mô tả" value={config.cta.description} onChange={value => setGroup('cta', 'description', value)} /></div>
              </div>
            </Section>
          </>}

          {activeTab === 'products' && <>
            <Section icon="local_cafe" title={`Cốc nến (${config.cups.length})`} description="Đường dẫn ảnh có thể là ảnh trong thư mục public hoặc URL ảnh đầy đủ.">
              <ArrayEditor rows={config.cups} columns={[{ label: 'Mã cốc' }, { label: 'Tên / màu' }, { label: 'Mã màu' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('cups', value)} addLabel="Thêm cốc" />
            </Section>
            <Section icon="circle" title={`Nắp cốc (${config.lids.length})`}>
              <ArrayEditor rows={config.lids} columns={[{ label: 'Mã nắp' }, { label: 'Tên nắp' }, { label: 'Kích thước / màu' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('lids', value)} addLabel="Thêm nắp" />
            </Section>
            <Section icon="bakery_dining" title={`Nến tạo hình (${config.shapedCandles.length})`}>
              <ArrayEditor rows={config.shapedCandles} columns={[{ label: 'Mã mẫu' }, { label: 'Tên mẫu' }, { label: 'Màu sắc' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('shapedCandles', value)} addLabel="Thêm mẫu" />
            </Section>
          </>}

          {activeTab === 'scents' && <Section icon="spa" title={`Danh sách mùi hương (${config.scents.length})`} description="Có thể thêm, sửa, xóa và thay đổi thứ tự. Trang khách tìm kiếm trên toàn bộ các trường này.">
            <ArrayEditor rows={config.scents} columns={[{ label: 'Mã mùi' }, { label: 'Tên mùi' }, { label: 'Hương đầu', multiline: true }, { label: 'Hương giữa', multiline: true }, { label: 'Hương cuối', multiline: true }]} onChange={value => setList('scents', value)} addLabel="Thêm mùi hương" />
          </Section>}

          {activeTab === 'pricing' && <>
            <Section icon="sell" title="Giá nến custom">
              <ArrayEditor rows={config.customPrices} columns={[{ label: 'Số lượng' }, { label: 'Cốc 200 ml' }, { label: 'Cốc 300 ml' }]} onChange={value => setList('customPrices', value)} addLabel="Thêm mức giá" />
            </Section>
            <Section icon="price_change" title="Giá nến tạo hình">
              <ArrayEditor rows={config.shapedPrices} columns={[{ label: 'Số lượng' }, { label: 'Đơn giá / cốc' }]} onChange={value => setList('shapedPrices', value)} addLabel="Thêm mức giá" />
            </Section>
          </>}

          {activeTab === 'policies' && <>
            <Section icon="package_2" title="Các bước hoàn thiện nhãn và bao bì">
              <ArrayEditor rows={config.packagingSteps} columns={[{ label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('packagingSteps', value)} addLabel="Thêm bước" />
            </Section>
            <Section icon="account_tree" title="Quy trình đặt hàng">
              <ArrayEditor rows={config.processSteps} columns={[{ label: 'Số bước' }, { label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('processSteps', value)} addLabel="Thêm bước" />
            </Section>
            <Section icon="policy" title="Chính sách hiển thị">
              <ArrayEditor rows={config.policies} columns={[{ label: 'Tên chính sách' }, { label: 'Nội dung', multiline: true }]} onChange={value => setList('policies', value)} addLabel="Thêm chính sách" />
            </Section>
          </>}
            </div>}
          </main>
        </div>
      </div>
    </Layout>
  );
}
