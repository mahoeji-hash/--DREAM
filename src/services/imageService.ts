import { supabase, isSupabaseConfigured, SUPABASE_IMAGES_BUCKET } from '../supabaseClient';

/**
 * Image processing, compression, and Supabase Storage upload utility
 * Optimizes high-resolution phone/camera photos and stores them in Supabase Storage bucket ('images')
 */

export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      if (file.size < 100 * 1024) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; ext: string } {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0]?.match(/:(.*?);/);
  const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = contentType.split('/')[1]?.split('+')[0] || 'jpg';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return {
    blob: new Blob([u8arr], { type: contentType }),
    contentType,
    ext: ext === 'jpeg' ? 'jpg' : ext,
  };
}

/**
 * Upload a Data URL or File to Supabase Storage ('images' bucket).
 * If input is already an http/https URL, returns it untouched.
 */
export async function uploadImageToSupabase(
  fileOrDataUrl: File | string,
  folder = 'general'
): Promise<{ url: string; uploadedToStorage: boolean; error?: string }> {
  if (!fileOrDataUrl) {
    return { url: '', uploadedToStorage: false };
  }

  // Already a remote URL
  if (typeof fileOrDataUrl === 'string' && /^https?:\/\//i.test(fileOrDataUrl)) {
    return { url: fileOrDataUrl, uploadedToStorage: true };
  }

  let dataUrl = '';
  if (typeof fileOrDataUrl === 'string') {
    dataUrl = fileOrDataUrl;
  } else {
    dataUrl = await compressImageFile(fileOrDataUrl);
  }

  if (!dataUrl) {
    return { url: '', uploadedToStorage: false, error: '이미지 데이터를 읽을 수 없습니다.' };
  }

  if (!isSupabaseConfigured || !dataUrl.startsWith('data:')) {
    return { url: dataUrl, uploadedToStorage: false };
  }

  try {
    const { blob, contentType, ext } = dataUrlToBlob(dataUrl);
    const cleanFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
    const fileName = `${cleanFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_IMAGES_BUCKET)
      .upload(fileName, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn('Supabase Storage upload error:', uploadError.message);
      return {
        url: dataUrl,
        uploadedToStorage: false,
        error: uploadError.message,
      };
    }

    const { data: publicData } = supabase.storage
      .from(SUPABASE_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    if (publicData?.publicUrl) {
      return { url: publicData.publicUrl, uploadedToStorage: true };
    }

    return { url: dataUrl, uploadedToStorage: false };
  } catch (err: any) {
    console.warn('Supabase Storage upload exception:', err?.message || err);
    return {
      url: dataUrl,
      uploadedToStorage: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Convenience helper for <input type="file"> handlers:
 * Compresses the File and uploads it directly to Supabase Storage 'images' bucket.
 */
export async function uploadImageFileToBucket(
  file: File,
  folder = 'general'
): Promise<{ url: string; uploadedToStorage: boolean; error?: string }> {
  return uploadImageToSupabase(file, folder);
}
