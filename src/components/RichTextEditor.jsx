import { useEffect, useRef } from 'react';
import { descriptionToHtml } from '../utils/richText';

const actions = [
  ['bold', 'format_bold', 'In đậm'],
  ['italic', 'format_italic', 'In nghiêng'],
  ['underline', 'format_underlined', 'Gạch chân'],
  ['strikeThrough', 'strikethrough_s', 'Gạch ngang'],
  ['insertUnorderedList', 'format_list_bulleted', 'Danh sách dấu chấm'],
  ['insertOrderedList', 'format_list_numbered', 'Danh sách đánh số'],
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const html = descriptionToHtml(value);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [value]);

  const emitChange = () => onChange(editorRef.current?.innerHTML || '');
  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) selectionRef.current = selection.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    editorRef.current?.focus();
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };
  const run = (command, commandValue = null) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, commandValue);
    rememberSelection();
    emitChange();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 px-2 py-2">
        {actions.map(([command, icon, label]) => (
          <button key={command} type="button" title={label} aria-label={label}
            onMouseDown={(event) => { event.preventDefault(); run(command); }}
            className="flex size-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-white hover:text-primary hover:shadow-xs">
            <span className="material-symbols-outlined text-[19px]">{icon}</span>
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-stone-200" />
        <label className="relative flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-stone-600 hover:bg-white" title="Màu chữ">
          <span className="material-symbols-outlined text-[18px]">format_color_text</span>
          <span>Màu chữ</span>
          <input type="color" defaultValue="#4a2c2a" aria-label="Chọn màu chữ"
            onMouseDown={rememberSelection}
            onChange={(event) => run('foreColor', event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <button type="button" title="Xóa định dạng" aria-label="Xóa định dạng"
          onMouseDown={(event) => { event.preventDefault(); run('removeFormat'); }}
          className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-stone-500 hover:bg-white hover:text-primary">
          <span className="material-symbols-outlined text-[17px]">format_clear</span>
          Xóa định dạng
        </button>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onFocus={rememberSelection}
        className="rich-text-editor min-h-44 max-h-80 overflow-y-auto px-4 py-3 text-sm leading-6 text-stone-800 outline-none" />
    </div>
  );
}
