/**
 * ErrorState — full-page or section-level error display with retry.
 *
 * Props:
 *   title   {string}     Heading (defaults to "Something went wrong")
 *   message {string}     Specific error message from the API
 *   onRetry {function}   Called when the "Try again" button is clicked
 *   full    {boolean}    If true, takes full viewport height (for page-level)
 *
 * Usage:
 *   <ErrorState message={error} onRetry={fetchData} />
 *   <ErrorState full message={error} onRetry={fetchData} />
 */

const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  full = false,
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center px-6 ${
      full ? 'min-h-screen' : 'py-20'
    }`}
  >
    {/* Icon */}
    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
      <svg
        className="w-8 h-8 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    </div>

    <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>

    {message && (
      <p className="text-sm text-gray-500 mb-6 max-w-sm leading-relaxed">{message}</p>
    )}

    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Try again
      </button>
    )}
  </div>
)

export default ErrorState
