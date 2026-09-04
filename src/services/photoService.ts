import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

/** Uploads under properties/{propertyId}/... so storage.rules can scope by claim. Returns the download URL. */
export async function uploadPhoto(propertyId: string, folder: 'visitors' | 'deliveries' | 'incidents', blob: Blob): Promise<string> {
  const name = `${folder}/${crypto.randomUUID()}.jpg`
  const objectRef = ref(storage, `properties/${propertyId}/${name}`)
  await uploadBytes(objectRef, blob, { contentType: blob.type || 'image/jpeg' })
  return getDownloadURL(objectRef)
}
