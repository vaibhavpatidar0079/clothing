import React from 'react';

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">
          {label}
        </label>
      )}
      <input
        className={`
          flex h-12 w-full bg-transparent border-0 border-b-2 border-gray-300 px-0 py-3 text-sm placeholder:text-gray-400 
          focus:outline-none focus:ring-0 focus:border-b-2 focus:border-black transition-colors duration-200
          disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-200
          ${error ? 'border-b-2 border-error-500 focus:border-error-500' : ''}
          ${className}
        `}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-2 text-xs text-error-500 font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;