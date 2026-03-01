/**
 * Button — reusable button with built-in loading spinner + disabled state.
 *
 * Props:
 *   loading   {boolean}  Shows spinner and disables the button
 *   variant   {'primary'|'secondary'|'danger'|'ghost'}
 *   size      {'sm'|'md'|'lg'}
 *   className {string}   Extra Tailwind classes
 *   ...rest             All other standard <button> props
 *
 * Usage:
 *   <Button loading={saving} onClick={handleSave}>Save</Button>
 *   <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
 */

const variants = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50',
  danger:    'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400',
  ghost:     'text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

const Button = ({
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    disabled={loading || disabled}
    className={`
      inline-flex items-center justify-center gap-2 rounded-lg font-semibold
      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
      ${variants[variant] ?? variants.primary}
      ${sizes[size] ?? sizes.md}
      ${className}
    `}
    {...rest}
  >
    {loading && <Spinner />}
    {children}
  </button>
)

export default Button
