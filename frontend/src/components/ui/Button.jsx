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
  
  const baseStyles = 'inline-flex items-center justify-center rounded-none font-bold uppercase text-xs tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] relative overflow-hidden';
  
  const variants = {
    // Primary: Black with fill animation on hover
    primary: `
      bg-black text-white border border-black
      before:absolute before:inset-0 before:bg-white before:origin-left before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100
      hover:text-black relative z-10
    `,
    // Secondary: White with fill animation
    secondary: `
      bg-white text-black border border-black
      before:absolute before:inset-0 before:bg-black before:origin-left before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100
      hover:text-white relative z-10
    `,
    // Outline: Border only with fill
    outline: `
      bg-transparent border border-black text-black
      before:absolute before:inset-0 before:bg-black before:origin-left before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100
      hover:text-white relative z-10
    `,
    // Ghost: Minimal with underline effect
    ghost: 'text-black border-b-2 border-transparent hover:border-black bg-transparent rounded-none',
    // Danger: Red with fill animation
    danger: `
      bg-error-600 text-white border border-error-600
      before:absolute before:inset-0 before:bg-white before:origin-left before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100
      hover:text-error-600 relative z-10
    `,
    // Link: Text only, no fill
    link: 'text-black underline-offset-4 hover:underline p-0 h-auto border-none',
  };

  const sizes = {
    sm: 'h-8 px-4 text-[11px]',
    md: 'h-11 px-8 py-2 text-xs',
    lg: 'h-12 px-10 text-xs',
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
      <span className="relative z-20 flex items-center justify-center">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;