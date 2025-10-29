
// Define the Blob interface locally as it's not exported from the package.
export interface Blob { 
    data: string; 
    mimeType: string; 
}

// For Live API - Encode audio data
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// For Live API - create Blob
export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// For Image uploads
export const fileToBase64 = (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (onProgress) {
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            };
        }

        reader.onload = () => {
            if (onProgress) {
                onProgress(100); // Ensure it completes to 100%
            }
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            resolve(result.split(',')[1]);
        };
        
        reader.onerror = error => reject(error);

        reader.readAsDataURL(file);
    });
};
