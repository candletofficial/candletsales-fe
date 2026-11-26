import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import systemConfigService from '../services/systemConfigService';
import {
  CUSTOM_PAGE_CONFIG_KEY, defaultCustomPageConfig, mergeCustomPageConfig,
} from './shop/customPageConfig';

const clone = value => JSON.parse(JSON.stringify(value));

const tabs = [
  ['general', 'Nội dung & liên hệ', 'contact_page'],
  ['products', 'Cốc & nắp', 'coffee_maker'],
  ['scents', 'Mùi hương', 'spa'],
  ['pricing', 'Bảng giá', 'payments'],
  ['policies', 'Quy trình & chính sách', 'fact_check'],
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
      <span className="mb-1.5 block text-[11px] font-bold text-on-surface">{label}</span>
      <Component
        type={multiline ? undefined : type}
        value={value || ''}
        rows={multiline ? 3 : undefined}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
      {hint && <span className="mt-1 block text-[10px] text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-outline-variant/70 pb-4">
        <h2 className="text-base font-black text-on-surface">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ArrayEditor({ rows, columns, onChange, addLabel = 'Thêm dòng' }) {
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

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
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
      <button type="button" onClick={() => onChange([...rows, columns.map(() => '')])} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 text-xs font-bold text-primary hover:bg-primary-container/40">
        <span className="material-symbols-outlined text-[18px]">add</span>{addLabel}
      </button>
    </div>
  );
}

export default function CustomPageManagement() {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState(() => clone(defaultCustomPageConfig));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    systemConfigService.getConfig(CUSTOM_PAGE_CONFIG_KEY)
      .then(response => setConfig(mergeCustomPageConfig(response?.data?.value)))
      .catch(error => setNotice({ type: 'error', text: error.response?.data?.message || 'Không thể tải cấu hình. Đang hiển thị dữ liệu mặc định.' }))
      .finally(() => setLoading(false));
  }, []);

  const setGroup = (group, key, value) => setConfig(current => ({
    ...current,
    [group]: { ...current[group], [key]: value },
  }));
  const setList = (key, value) => setConfig(current => ({ ...current, [key]: value }));

  const save = async () => {
    try {
      setSaving(true);
      setNotice(null);
      await systemConfigService.updateConfig(CUSTOM_PAGE_CONFIG_KEY, config);
      setNotice({ type: 'success', text: 'Đã cập nhật trang custom. Khách tải lại trang sẽ thấy dữ liệu mới.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Không thể lưu cấu hình trang custom.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-secondary">Nội dung website</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-on-surface sm:text-3xl">Quản lý trang Custom</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-on-surface-variant">Chỉnh nội dung, danh mục, giá, chính sách và các kênh liên hệ đang hiển thị tại trang nến custom.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/custom-candles" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 text-xs font-bold text-on-surface"><span className="material-symbols-outlined text-[18px]">open_in_new</span>Xem trang</a>
            <button type="button" onClick={save} disabled={saving || loading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-white shadow-sm disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </header>

        {notice && <div className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><span className="material-symbols-outlined text-[19px]">{notice.type === 'success' ? 'check_circle' : 'error'}</span>{notice.text}</div>}

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant bg-white p-2">
          {tabs.map(([id, label, icon]) => <button type="button" key={id} onClick={() => setActiveTab(id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold transition ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}`}><span className="material-symbols-outlined text-[18px]">{icon}</span>{label}</button>)}
        </div>

        {loading ? <div className="grid min-h-72 place-items-center rounded-2xl border border-outline-variant bg-white"><span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span></div> : <div className="space-y-5">
          {activeTab === 'general' && <>
            <Section title="Kênh liên hệ" description="Các nút Zalo và Facebook trên trang sẽ dùng trực tiếp thông tin này.">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Số điện thoại Zalo" value={config.contact.zaloPhone} onChange={value => setGroup('contact', 'zaloPhone', value)} hint="Chỉ nhập số, ví dụ 0328624761" />
                <Field label="Link Zalo" value={config.contact.zaloUrl} onChange={value => setGroup('contact', 'zaloUrl', value)} hint="Ví dụ https://zalo.me/0328624761" />
                <Field label="Link Fanpage" value={config.contact.fanpageUrl} onChange={value => setGroup('contact', 'fanpageUrl', value)} />
              </div>
            </Section>
            <Section title="Phần mở đầu">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nhãn nhỏ" value={config.hero.eyebrow} onChange={value => setGroup('hero', 'eyebrow', value)} />
                <Field label="Tiêu đề" value={config.hero.title} onChange={value => setGroup('hero', 'title', value)} />
                <div className="md:col-span-2"><Field multiline label="Mô tả" value={config.hero.description} onChange={value => setGroup('hero', 'description', value)} /></div>
              </div>
            </Section>
            <Section title="Nhóm khách hàng" description="Ba thẻ giới thiệu ngay dưới phần mở đầu.">
              <ArrayEditor rows={config.introCards} columns={[{ label: 'Tên icon Phosphor' }, { label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('introCards', value)} addLabel="Thêm nhóm" />
            </Section>
            {copySections.map(([group, title, fields]) => (
              <Section key={group} title={title}>
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map(([key, label, multiline]) => <div key={key} className={multiline ? 'md:col-span-2' : ''}><Field multiline={multiline} label={label} value={config[group][key]} onChange={value => setGroup(group, key, value)} /></div>)}
                </div>
              </Section>
            ))}
            <Section title="Lời kêu gọi cuối trang">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nhãn nhỏ" value={config.cta.eyebrow} onChange={value => setGroup('cta', 'eyebrow', value)} />
                <Field label="Tiêu đề" value={config.cta.title} onChange={value => setGroup('cta', 'title', value)} />
                <div className="md:col-span-2"><Field multiline label="Mô tả" value={config.cta.description} onChange={value => setGroup('cta', 'description', value)} /></div>
              </div>
            </Section>
          </>}

          {activeTab === 'products' && <>
            <Section title={`Cốc nến (${config.cups.length})`} description="Đường dẫn ảnh có thể là ảnh trong thư mục public hoặc URL ảnh đầy đủ.">
              <ArrayEditor rows={config.cups} columns={[{ label: 'Mã cốc' }, { label: 'Tên / màu' }, { label: 'Mã màu' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('cups', value)} addLabel="Thêm cốc" />
            </Section>
            <Section title={`Nắp cốc (${config.lids.length})`}>
              <ArrayEditor rows={config.lids} columns={[{ label: 'Mã nắp' }, { label: 'Tên nắp' }, { label: 'Kích thước / màu' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('lids', value)} addLabel="Thêm nắp" />
            </Section>
            <Section title={`Nến tạo hình (${config.shapedCandles.length})`}>
              <ArrayEditor rows={config.shapedCandles} columns={[{ label: 'Mã mẫu' }, { label: 'Tên mẫu' }, { label: 'Màu sắc' }, { label: 'Đường dẫn ảnh' }]} onChange={value => setList('shapedCandles', value)} addLabel="Thêm mẫu" />
            </Section>
          </>}

          {activeTab === 'scents' && <Section title={`Danh sách mùi hương (${config.scents.length})`} description="Có thể thêm, sửa, xóa và thay đổi thứ tự. Trang khách tìm kiếm trên toàn bộ các trường này.">
            <ArrayEditor rows={config.scents} columns={[{ label: 'Mã mùi' }, { label: 'Tên mùi' }, { label: 'Hương đầu', multiline: true }, { label: 'Hương giữa', multiline: true }, { label: 'Hương cuối', multiline: true }]} onChange={value => setList('scents', value)} addLabel="Thêm mùi hương" />
          </Section>}

          {activeTab === 'pricing' && <>
            <Section title="Giá nến custom">
              <ArrayEditor rows={config.customPrices} columns={[{ label: 'Số lượng' }, { label: 'Cốc 200 ml' }, { label: 'Cốc 300 ml' }]} onChange={value => setList('customPrices', value)} addLabel="Thêm mức giá" />
            </Section>
            <Section title="Giá nến tạo hình">
              <ArrayEditor rows={config.shapedPrices} columns={[{ label: 'Số lượng' }, { label: 'Đơn giá / cốc' }]} onChange={value => setList('shapedPrices', value)} addLabel="Thêm mức giá" />
            </Section>
          </>}

          {activeTab === 'policies' && <>
            <Section title="Các bước hoàn thiện nhãn và bao bì">
              <ArrayEditor rows={config.packagingSteps} columns={[{ label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('packagingSteps', value)} addLabel="Thêm bước" />
            </Section>
            <Section title="Quy trình đặt hàng">
              <ArrayEditor rows={config.processSteps} columns={[{ label: 'Số bước' }, { label: 'Tiêu đề' }, { label: 'Mô tả', multiline: true }]} onChange={value => setList('processSteps', value)} addLabel="Thêm bước" />
            </Section>
            <Section title="Chính sách hiển thị">
              <ArrayEditor rows={config.policies} columns={[{ label: 'Tên chính sách' }, { label: 'Nội dung', multiline: true }]} onChange={value => setList('policies', value)} addLabel="Thêm chính sách" />
            </Section>
          </>}
        </div>}
      </div>
    </Layout>
  );
}
