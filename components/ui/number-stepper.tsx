'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  className,
}: NumberStepperProps) {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0
    const clampedValue = Math.min(Math.max(newValue, min), max)
    onChange(clampedValue)
  }

  const isMinDisabled = disabled || value <= min
  const isMaxDisabled = disabled || value >= max

  return (
    <div className={cn('flex items-center', className)}>
      {/* Decrement button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isMinDisabled}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-l-md border border-r-0 border-gray-300 bg-white transition-colors',
          'hover:bg-gray-100 active:bg-gray-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset'
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </button>

      {/* Input */}
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled}
        className={cn(
          'w-10 h-8 text-center border-y border-gray-300 bg-white text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
        aria-label="Quantity"
      />

      {/* Increment button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isMaxDisabled}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-r-md border border-l-0 border-gray-300 bg-white transition-colors',
          'hover:bg-gray-100 active:bg-gray-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset'
        )}
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
