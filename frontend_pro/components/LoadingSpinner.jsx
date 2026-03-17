// LoadingSpinner.jsx
export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  }

  const spinner = (
    <div className="flex items-center justify-center">
      <div 
        className={`${sizes[size]} border-[#E5E7EB] border-t-[#03045E] rounded-full animate-spin`}
      />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          {spinner}
          <p className="text-sm text-[#475569] animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return spinner
}