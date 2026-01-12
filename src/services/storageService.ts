import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a base64 string to Firebase Storage and returns the download URL.
 * Automatically detects the format (pdf, png, etc) or allows override.
 */
export const uploadAsset = async (
    userId: string,
    appId: string,
    assetName: string,
    base64Data: string
): Promise<string> => {
    // Determine path
    // e.g., users/USER_ID/applications/APP_ID/assets/report.pdf
    const storagePath = `users/${userId}/applications/${appId}/assets/${assetName}`;
    const storageRef = ref(storage, storagePath);

    try {
        // base64Data might be a Data URL (starts with data:...)
        // uploadString can handle 'data_url' format
        const format = base64Data.startsWith('data:') ? 'data_url' : 'base64';

        await uploadString(storageRef, base64Data, format);
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`[Storage] Asset uploaded successfully: ${storagePath}`);
        return downloadURL;
    } catch (error) {
        console.error(`[Storage] Error uploading asset ${storagePath}:`, error);
        throw error;
    }
};
