import { useRef, useState } from 'react';
import { useUploadImage } from '@workspace/api-client-react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';

/** Downscale to max 1600px and re-encode as WebP so uploads stay small. */
export async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.85);
}

/** Compact square uploader (e.g. a photo per colour); click to upload, × to clear. */
export function ImageThumbUpload({ value, onChange, title }: { value?: string | null; onChange: (url: string | null) => void; title?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const { url } = await upload.mutateAsync({ data: { dataUrl: await compress(file) } });
      onChange(url);
    } catch (e) {
      alert((e as { data?: { error?: string } })?.data?.error ?? 'Не вдалося завантажити');
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={title ?? 'Фото'}
        onClick={() => input.current?.click()}
        className="w-12 h-12 rounded-xl border border-dashed border-white/25 bg-white/5 hover:bg-white/10 flex items-center justify-center overflow-hidden"
      >
        {upload.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white/60" />
        ) : value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-4 h-4 text-white/50" />
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Прибрати фото"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

export function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [error, setError] = useState('');

  const onFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const { url } = await upload.mutateAsync({ data: { dataUrl: await compress(file) } });
      onChange(url);
    } catch (e) {
      setError((e as { data?: { error?: string } })?.data?.error ?? 'Не вдалося завантажити');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
          className="relative w-24 h-24 shrink-0 rounded-xl border border-dashed border-white/25 bg-white/5 hover:bg-white/10 flex items-center justify-center overflow-hidden transition"
        >
          {upload.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin text-white/60" />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6 text-white/50" />
          )}
        </button>
        <div className="flex-1 space-y-2">
          <div className="text-xs text-white/50">Натисніть або перетягніть файл. Або вставте посилання:</div>
          <div className="flex gap-2">
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… або /api/images/1" />
            {value && (
              <button type="button" onClick={() => onChange('')} className="p-2 text-white/50 hover:text-white" aria-label="Прибрати">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
