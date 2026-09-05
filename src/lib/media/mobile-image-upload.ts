export async function compressImageForMobile(
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  },
): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1600;
  const maxHeight = options?.maxHeight ?? 1600;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith('image/')) return file;

  const imageBitmap = await createImageBitmap(file);
  let { width, height } = imageBitmap;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, targetType, quality),
  );

  if (!blob || blob.size >= file.size) return file;

  const ext = targetType === 'image/png' ? 'png' : 'jpg';
  const nextName = file.name.replace(/\.[^/.]+$/, '') + `.${ext}`;
  return new File([blob], nextName, {
    type: targetType,
    lastModified: Date.now(),
  });
}

export async function uploadImageWithProgress(
  endpoint: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; path?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }
        reject(new Error(data.error || 'Failed to upload image'));
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => reject(new Error('Network error during image upload'));
    xhr.send(formData);
  });
}
