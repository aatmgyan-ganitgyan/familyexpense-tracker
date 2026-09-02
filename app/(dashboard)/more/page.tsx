import Link from 'next/link'
import {
  Users,
  PiggyBank,
  FolderTree,
  RotateCw,
  Settings,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export default function MorePage() {
  const sections = [
    {
      title: 'Family Workspace',
      items: [
        {
          name: 'Family Workspace',
          description: 'Manage members, roles, and invite links',
          href: '/more/family',
          icon: Users,
          color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
        },
        {
          name: 'Budgets',
          description: 'Set monthly limits for family and categories',
          href: '/more/budget',
          icon: PiggyBank,
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
        },
        {
          name: 'Recurring Expenses',
          description: 'Automate recurring bills and subscriptions',
          href: '/more/recurring',
          icon: RotateCw,
          color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
        },
      ],
    },
    {
      title: 'Insights & Analytics',
      items: [
        {
          name: 'Categories',
          description: 'Manage standard and custom categories',
          href: '/more/categories',
          icon: FolderTree,
          color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
        },
        {
          name: 'Reports',
          description: 'Detailed analytics and monthly spend trends',
          href: '/more/reports',
          icon: TrendingUp,
          color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          name: 'Settings',
          description: 'Profile options, theme and preferences',
          href: '/more/settings',
          icon: Settings,
          color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        },
      ],
    },
  ]

  return (
    <div className="mx-auto max-w-md px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">More Options</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure budgets, manage family members, and view reports
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
              {section.title}
            </h2>
            <div className="space-y-2.5">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-800 transition shadow-xs group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color} shrink-0`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition" />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
