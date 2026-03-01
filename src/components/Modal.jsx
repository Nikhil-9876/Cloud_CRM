import { useEffect } from 'react'

/**
 * Modal — accessible dialog with:
 *  - Escape key to close
 *  - Backdrop click to close
 *  - Full-screen on mobile (< md breakpoint)
 *  - Scrollable content on desktop
 */
const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handleKey)
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      {/* Backdrop — hidden on mobile so full-screen panel feels native */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm hidden md:block"
        onClick={onClose}
      />
      {/* On mobile: slides up from the bottom and fills the screen.
          On desktop: centered card with max-width. */}
      <div className="relative bg-white w-full h-full md:h-auto md:rounded-2xl md:shadow-2xl md:max-w-lg md:max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default Modal
