"use client";

import React from "react";

interface ViewToggleProps {
  value: 'character' | 'task';
  onChange: (view: 'character' | 'task') => void;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ViewToggle({ value, onChange, size = 'md', className = '' }: ViewToggleProps) {
  const baseClasses = size === 'sm'
    ? 'text-xs px-3 py-1.5'
    : 'text-sm px-4 py-2';

  const buttonClasses = (isActive: boolean) => `
    ${baseClasses}
    rounded-lg font-medium transition-all duration-200
    ${isActive
      ? 'bg-purple-600 text-white'
      : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
    }
  `;

  return (
    <div className={`inline-flex gap-2 ${className}`}>
      <button
        onClick={() => onChange('character')}
        className={buttonClasses(value === 'character')}
      >
        Characters
      </button>
      <button
        onClick={() => onChange('task')}
        className={buttonClasses(value === 'task')}
      >
        Tasks
      </button>
    </div>
  );
}
