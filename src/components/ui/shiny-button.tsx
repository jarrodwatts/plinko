import React from "react";
import { cn } from "@/lib/utils";

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ShinyButton: React.FC<ShinyButtonProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium bg-blue-600 rounded-lg shadow-lg shadow-blue-600/25 group transition-all duration-300 ease-out hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-105",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700 ease-out"></span>
      <span className="relative text-white font-semibold z-10">
        {children}
      </span>
    </button>
  );
};

export { ShinyButton };