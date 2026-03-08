import { supabase } from '../supabase';

/**
 * OnboardingService - Handles driver document uploads and verification state
 */

const BUCKET_NAME = 'driver-documents';

/**
 * Upload a file to the driver-documents bucket
 * @param {string} userId 
 * @param {string} docType - 'ine_front', 'ine_back', 'license', 'rfc', 'curp', 'non_criminal', 'selfie'
 * @param {Blob|File} fileBlob 
 */
export async function uploadDriverDocument(userId, docType, fileBlob) {
    try {
        const fileExt = fileBlob.type?.split('/')[1] || 'jpg';
        const fileName = `${userId}/${docType}_${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, fileBlob, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err) {
        console.error(`[OnboardingService] Error uploading ${docType}:`, err);
        throw err;
    }
}

/**
 * Update the driver's document metadata in their user profile
 * @param {string} userId 
 * @param {object} documentUrls - { [docType]: url }
 */
export async function updateDriverDocumentMeta(userId, documentUrls) {
    try {
        const { data: currentUser } = await supabase
            .from('users')
            .select('driver_documents')
            .eq('id', userId)
            .single();

        const updatedDocs = {
            ...(currentUser?.driver_documents || {}),
            ...documentUrls
        };

        const { error } = await supabase
            .from('users')
            .update({
                driver_documents: updatedDocs,
                verification_status: 'pending', // Reset to pending if new docs uploaded
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[OnboardingService] Error updating document meta:', err);
        throw err;
    }
}

/**
 * Specifically for the selfie/profile photo
 */
export async function updateDriverSelfie(userId, selfieUrl) {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                photoURL: selfieUrl, // For Auth/Profile display
                selfie_url: selfieUrl, // For Admin verification
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[OnboardingService] Error updating selfie:', err);
        throw err;
    }
}

export default {
    uploadDriverDocument,
    updateDriverDocumentMeta,
    updateDriverSelfie
};
