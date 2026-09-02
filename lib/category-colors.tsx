import React from 'react'
import * as Icons from 'lucide-react'

export interface CategoryColorStyles {
  bg: string
  text: string
  border: string
  badge: string
  ring: string
  solid: string
}

// Fixed color palettes by category name (case-insensitive)
export const CATEGORY_COLORS: Record<string, CategoryColorStyles> = {
  bills: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/60',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    ring: 'focus:ring-purple-500 border-purple-500',
    solid: 'bg-purple-600 text-white',
  },
  food: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/60',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    ring: 'focus:ring-orange-500 border-orange-500',
    solid: 'bg-orange-600 text-white',
  },
  travel: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/60',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    ring: 'focus:ring-blue-500 border-blue-500',
    solid: 'bg-blue-600 text-white',
  },
  groceries: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    ring: 'focus:ring-emerald-500 border-emerald-500',
    solid: 'bg-emerald-600 text-white',
  },
  education: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    ring: 'focus:ring-indigo-500 border-indigo-500',
    solid: 'bg-indigo-600 text-white',
  },
  entertainment: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800/60',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
    ring: 'focus:ring-pink-500 border-pink-500',
    solid: 'bg-pink-600 text-white',
  },
  health: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    ring: 'focus:ring-rose-500 border-rose-500',
    solid: 'bg-rose-600 text-white',
  },
  home: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    ring: 'focus:ring-amber-500 border-amber-500',
    solid: 'bg-amber-600 text-white',
  },
  personal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800/60',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
    ring: 'focus:ring-teal-500 border-teal-500',
    solid: 'bg-teal-600 text-white',
  },
  shopping: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800/60',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    ring: 'focus:ring-violet-500 border-violet-500',
    solid: 'bg-violet-600 text-white',
  },
  other: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    ring: 'focus:ring-slate-500 border-slate-500',
    solid: 'bg-slate-600 text-white',
  },
}

// Fallback palette pool for dynamic custom categories
const FALLBACK_PALETTE: CategoryColorStyles[] = [
  CATEGORY_COLORS.food,
  CATEGORY_COLORS.travel,
  CATEGORY_COLORS.groceries,
  CATEGORY_COLORS.education,
  CATEGORY_COLORS.entertainment,
  CATEGORY_COLORS.bills,
  CATEGORY_COLORS.health,
  CATEGORY_COLORS.home,
  CATEGORY_COLORS.personal,
  CATEGORY_COLORS.shopping,
]

export function getCategoryColor(name?: string | null): CategoryColorStyles {
  if (!name) return CATEGORY_COLORS.other
  const cleanName = name.trim().toLowerCase()

  if (CATEGORY_COLORS[cleanName]) {
    return CATEGORY_COLORS[cleanName]
  }

  // Consistent hash for custom category names
  let hash = 0
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[index]
}

// Dynamic Lucide icon component with safe fallback
export function CategoryIcon({
  name,
  className = 'h-5 w-5',
}: {
  name?: string | null
  className?: string
}) {
  if (!name) {
    const CoinsIcon = Icons.Coins
    return <CoinsIcon className={className} />
  }

  const cleanIconName = name.trim()
  const IconComponent = (Icons as any)[cleanIconName] || Icons.Coins
  return <IconComponent className={className} />
}

// Reusable styled category icon box
export function CategoryIconBox({
  categoryName,
  iconName,
  size = 'md',
  className = '',
}: {
  categoryName?: string | null
  iconName?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const colors = getCategoryColor(categoryName)
  
  const sizeClasses = {
    sm: 'h-8 w-8 rounded-lg text-xs',
    md: 'h-10 w-10 rounded-xl text-sm',
    lg: 'h-12 w-12 rounded-2xl text-base',
  }[size]

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size]

  return (
    <div
      className={`flex items-center justify-center shrink-0 border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses} ${className}`}
    >
      <CategoryIcon name={iconName} className={iconSizeClasses} />
    </div>
  )
}
