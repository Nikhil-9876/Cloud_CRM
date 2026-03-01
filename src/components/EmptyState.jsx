/**
 * EmptyState — reusable illustrated empty-state component.
 *
 * Props:
 *   icon        {ReactNode}   SVG icon to display (defaults to inbox icon)
 *   title       {string}      Bold heading text
 *   description {string}      Sub-text
 *   action      {ReactNode}   Optional button/link element
 *   className   {string}      Extra classes on the wrapper
 *
 * Usage:
 *   <EmptyState
 *     title="No contacts yet"
 *     description="Add your first contact to get started."
 *     action={<Button onClick={openAdd}>Add Contact</Button>}
 *   />
 */

const DefaultIcon = () => (
  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
)

const EmptyState = ({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    <div className="mb-4">{icon ?? <DefaultIcon />}</div>
    <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-gray-400 mb-5 max-w-xs leading-relaxed">{description}</p>
    )}
    {action}
  </div>
)

export default EmptyState
