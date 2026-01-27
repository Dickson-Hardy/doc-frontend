import { put } from '@vercel/blob';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class BlobUploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BlobUploadError';
  }
}

export async function uploadToBlob(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file size (3MB max)
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  if (file.size > MAX_SIZE) {
    throw new BlobUploadError('File size must be less than 3MB', 'FILE_TOO_LARGE');
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    throw new BlobUploadError('Please upload PDF or DOC files only', 'INVALID_FILE_TYPE');
  }

  try {
    // Create a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const filename = `abstracts/${timestamp}-${randomString}.${extension}`;

    // Simulate progress for better UX
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5; // Random progress between 5-20%
      if (progress > 90) progress = 90;
      
      onProgress?.({
        loaded: (progress / 100) * file.size,
        total: file.size,
        percentage: Math.round(progress)
      });
    }, 200);

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      token: import.meta.env.VITE_BLOB_READ_WRITE_TOKEN,
    });

    // Complete progress
    clearInterval(progressInterval);
    onProgress?.({
      loaded: file.size,
      total: file.size,
      percentage: 100
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      contentDisposition: `attachment; filename="${file.name}"`
    };

  } catch (error) {
    console.error('Blob upload error:', error);
    
    if (error instanceof Error) {
      throw new BlobUploadError(
        `Upload failed: ${error.message}`,
        'UPLOAD_FAILED'
      );
    }
    
    throw new BlobUploadError('Upload failed due to an unknown error', 'UNKNOWN_ERROR');
  }
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size must be less than 3MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload PDF or DOC files only' };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}