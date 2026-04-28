/**
 * Utilities for working with document/binary file uploads in the admin.
 */

/** Returns the MIME type for a given file extension. Internal use only. */
function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'application/pdf'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Opens a pending (not-yet-uploaded) binary file in a new browser tab by
 * converting its base64 payload to a temporary object URL.
 * The URL is revoked after 30 seconds.
 */
export function openPendingFile(base64: string, publicUrl: string): void {
  const ext = publicUrl.split('.').pop() ?? 'pdf'
  const mime = mimeFromExt(ext)
  const byteChars = atob(base64)
  const byteArr = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
  const blob = new Blob([byteArr], { type: mime })
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
}
