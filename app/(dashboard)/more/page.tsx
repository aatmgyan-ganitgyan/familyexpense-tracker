import Link from 'next/link'
import {
  Users,
  Calendar,
  PiggyBank,
  FolderTree,
  RotateCw,
  Settings,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export default function MorePage() {
  const menuItems = [
    {
      name: 'Family Workspace',
      description: 'Manage members and view invite code',
      href: '/more/family',
      icon: Users,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
    },
    {
      name: 'Budgets',
      description: 'Set spending limits for your family',
      href: '/more/budget',
      icon: PiggyBank,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      name: 'Recurring Expenses',
      description: 'Automate recurring bills and subscriptions',
      href: '/more/recurring',
      icon: RotateCw,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      name: 'Categories',
      description: 'View list of active categories',
      href: '/more/categories',
      icon: FolderTree,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      name: 'Reports',
      description: 'Detailed analytics and monthly breakdowns',
      href: '/more/reports',
      icon: TrendingUp,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30',
    },
    {
      name: 'Settings',
      description: 'Profile options and preferences',
      href: '/more/settings',
      icon: Settings,
      color: 'text-gray-500 bg-gray-50 dark:bg-gray-950/30',
    },
  ]

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">More Options</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure budgets, manage family members, and view reports</p>

      <div className="mt-6 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-indigo-500 transition shadow-xs"
            >
              <div className="flex items-center space-x-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
