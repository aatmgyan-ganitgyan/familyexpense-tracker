'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  FolderTree,
  X,
  Sparkles,
} from 'lucide-react'
import { CategoryIcon, CategoryIconBox, getCategoryColor } from '@/lib/category-colors'
import { addCustomCategory, deleteCustomCategory } from '@/app/actions/categories'

const AVAILABLE_ICONS = [
  'Utensils',
  'ShoppingCart',
  'Car',
  'Home',
  'FileText',
  'ShoppingBag',
  'GraduationCap',
  'HeartPulse',
  'Film',
  'User',
  'Coins',
  'Coffee',
  'Fuel',
  'Tv',
  'Plane',
  'Gift',
  'Dumbbell',
  'Music',
  'Smartphone',
  'Baby',
  'Briefcase',
  'Laptop',
  'Camera',
  'Shield',
  'Tag',
  'Sparkles',
  'BookOpen',
  'Wrench',
  'PawPrint',
  'Pizza',
]

interface Category {
  id: string
  name: string
  icon: string
  family_id: string | null
  created_at?: string
}

interface CategoriesClientProps {
  initialCategories: Category[]
  isAdmin: boolean
  familyId: string
}

export default function CategoriesClient({
  initialCategories,
  isAdmin,
  familyId,
}: CategoriesClientProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Tag')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      setErrorMsg('Please enter a category name.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const res = await addCustomCategory({
      name: newCatName.trim(),
      icon: selectedIcon,
    })

    if (res.error) {
      setErrorMsg(res.error)
    } else if (res.category) {
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)))
      setSuccessMsg(`Category "${newCatName.trim()}" added successfully!`)
      setShowAddModal(false)
      setNewCatName('')
      setSelectedIcon('Tag')
      router.refresh()
    }
    setLoading(false)
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete custom category "${categoryName}"?`)) {
      return
    }

    setDeletingId(categoryId)
    setErrorMsg(null)
    setSuccessMsg(null)

    const res = await deleteCustomCategory(categoryId)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      setSuccessMsg(`Category "${categoryName}" removed.`)
      router.refresh()
    }
    setDeletingId(null)
  }

  const defaultCategories = categories.filter((c) => !c.family_id)
  const customCategories = categories.filter((c) => c.family_id === familyId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/more"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expense Categories</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {categories.length} active categories available
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setShowAddModal(true)
              setErrorMsg(null)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-lg bg-green-50 p-4 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Custom Family Categories (if any) */}
      {customCategories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Family Custom Categories ({customCategories.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {customCategories.map((cat) => {
              const colors = getCategoryColor(cat.name)
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center space-x-3">
                    <CategoryIconBox categoryName={cat.name} iconName={cat.icon} size="md" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {cat.name}
                      </h3>
                      <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        Custom
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      disabled={deletingId === cat.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                      title="Delete category"
                    >
                      {deletingId === cat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Global Default Categories */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Default Categories ({defaultCategories.length})
        </h2>
        <div className="grid grid-cols-1 gap-2.5">
          {defaultCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center space-x-3">
                <CategoryIconBox categoryName={cat.name} iconName={cat.icon} size="md" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{cat.name}</h3>
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Default
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <FolderTree className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Custom Category</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pet Care, Subscriptions, Fitness"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Icon
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  {AVAILABLE_ICONS.map((icon) => {
                    const isSelected = selectedIcon === icon
                    return (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs scale-105'
                            : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        title={icon}
                      >
                        <CategoryIcon name={icon} className="h-5 w-5" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div className="flex items-center space-x-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 border border-gray-200/60 dark:border-gray-700">
                <CategoryIconBox
                  categoryName={newCatName || 'Category'}
                  iconName={selectedIcon}
                  size="md"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {newCatName.trim() || 'Category Preview'}
                  </p>
                  <p className="text-[10px] text-gray-400">Custom Category</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
