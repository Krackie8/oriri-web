import React, { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';
import { ImagePlus, Loader2, X } from 'lucide-react';
import * as wellnessApi from '../../utils/wellnessApi';

interface PhotoPickerProps {
  accessToken?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  /** 1 for a single cover image, more for a gallery. */
  max?: number;
}

/** Upload straight from the phone's camera roll — no URLs to copy. */
export default function PhotoPicker({ accessToken, value, onChange, max = 1 }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = max - value.length;
    const picked = Array.from(files).slice(0, max === 1 ? 1 : room);
    if (!picked.length) {
      toast.error(`Up to ${max} photos`);
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    for (const file of picked) {
      const res = await wellnessApi.uploadPhoto(accessToken, file);
      if (res.ok && res.data) urls.push(res.data.url);
      else toast.error(`Could not upload ${file.name}: ${res.error}`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    if (urls.length) onChange(max === 1 ? urls.slice(0, 1) : [...value, ...urls]);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < max && (
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
          {uploading ? 'Uploading…' : max === 1 ? 'Add photo' : 'Add photos'}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
