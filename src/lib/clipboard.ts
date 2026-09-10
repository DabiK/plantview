/**
 * Copies text to the clipboard, falling back to a hidden textarea when the
 * async Clipboard API is unavailable (non-secure contexts, older browsers).
 */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this environment.')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const succeeded = document.execCommand('copy')
  textarea.remove()

  if (!succeeded) {
    throw new Error('Clipboard is not available in this browser.')
  }
}
