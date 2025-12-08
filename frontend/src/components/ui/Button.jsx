import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  children, 
  disabled, 
  type = 'button',
  ...props 
}, ref) => {
  
  const baseStyles = 'inline-flex items-center justify-center rounded-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800 border border-transparent shadow-sm',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm',
    outline: 'bg-transparent border border-gray-900 text-gray-900 hover:bg-gray-100',
    ghost: 'hover:bg-gray-100 hover:text-gray-900 text-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    link: 'text-black underline-offset-4 hover:underline p-0 h-auto',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-11 px-8 py-2 text-sm',
    lg: 'h-12 px-8 text-base',
    icon: 'h-10 w-10 p-2',
  };

  return (
    <button
      ref={ref}
      type={type}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;