'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Shield, User } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface FamilyClientProps {
  familyName: string
  inviteCode: string
  members: Member[]
}

export default function FamilyClient({ familyName, inviteCode, members }: FamilyClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/more"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Family Settings</h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Manage workspace and invite members</p>
        </div>
      </div>

      {/* Invite Code Box */}
      <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-6 dark:border-indigo-900/50 dark:bg-indigo-950/20 text-center space-y-3">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          Invite members to join <span className="font-bold text-indigo-600 dark:text-indigo-400">"{familyName}"</span>
        </p>
        <div className="flex items-center justify-center space-x-3">
          <span className="text-3xl font-extrabold tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
            {inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 shadow-xs"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          Share this invite code with family members. They can enter it during sign-up onboarding.
        </p>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Workspace Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xs"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {member.name}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate mt-0.5">{member.email}</p>
                </div>
              </div>
              <div>
                {member.role === 'admin' ? (
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400">
                    <Shield className="h-3 w-3" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-[8px] font-bold dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                    Member
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
