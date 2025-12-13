import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'glass';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading,
  disabled,
  ...props 
}) => {
  const baseStyle = "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-bold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-cyan-500/20",
    secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    glass: "backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        </span>
      ) : children}
    </button>
  );
};
