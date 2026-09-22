import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ className = '', ...props }, ref) => {
    const [show, setShow] = useState(false)
    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`input pr-10 ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
