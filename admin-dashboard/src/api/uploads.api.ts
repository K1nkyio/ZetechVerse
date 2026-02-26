import { apiClient } from './base';

export type UploadedMediaType = 'image' | 'video';

export interface UploadedMedia {
  url: string;
  media_type: UploadedMediaType;
  mime_type: string;
  filename: string;
  size: number;
}

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_UPLOAD_MB = parsePositiveInt(import.meta.env.VITE_UPLOAD_MAX_MB, 100);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.readAsDataURL(file);
  });

class UploadsApi {
  async uploadMedia(file: File): Promise<UploadedMedia> {
    if (!file) {
      throw new Error('No file selected');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File is too large. Maximum allowed size is ${MAX_UPLOAD_MB}MB.`);
    }

    const data = await fileToDataUrl(file);
    const response = await apiClient.post<UploadedMedia>('/uploads/media', {
      filename: file.name,
      mimeType: file.type,
      data
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to upload file');
    }

    return response.data.data;
  }
}

export const uploadsApi = new UploadsApi();
