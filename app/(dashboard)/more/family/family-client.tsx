'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  User,
  Share2,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { updateMemberRole, removeFamilyMember } from '@/app/actions/family'

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
  isAdmin?: boolean
  currentUserId?: string
}

const MEMBER_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-teal-500',
]

function getMemberInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function FamilyClient({
  familyName,
  inviteCode,
  members: initialMembers,
  isAdmin = false,
  currentUserId,
}: FamilyClientProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origin}/login?invite=${encodeURIComponent(inviteCode)}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleMakeAdmin = async (member: Member) => {
    setActionLoading(true)
    setActiveMenuId(null)
    setErrorMsg(null)

    const res = await updateMemberRole(member.id, 'admin')
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: 'admin' } : m))
      )
      setSuccessMsg(`"${member.name}" is now a family admin.`)
      router.refresh()
    }
    setActionLoading(false)
  }

  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to remove "${member.name}" from ${familyName}?`)) {
      return
    }

    setActionLoading(true)
    setActiveMenuId(null)
    setErrorMsg(null)

    const res = await removeFamilyMember(member.id)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      setSuccessMsg(`"${member.name}" has been removed from the family.`)
      router.refresh()
    }
    setActionLoading(false)
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
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Manage workspace and invite members
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-2xl bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-2xl bg-green-50 p-4 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invite Code Box */}
      <div className="rounded-3xl border border-indigo-150 bg-indigo-50/50 p-6 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-center space-y-4 shadow-xs">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Invite members to join{' '}
          <span className="font-bold text-indigo-600 dark:text-indigo-400">"{familyName}"</span>
        </p>

        <div className="flex items-center justify-center space-x-3">
          <span className="text-3xl font-black tracking-widest text-indigo-700 dark:text-indigo-300 font-mono">
            {inviteCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 shadow-xs transition"
            title="Copy Invite Code"
          >
            {copiedCode ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={handleCopyInviteLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-gray-400">
          Share this code or link with family members so they can join upon sign-up.
        </p>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Workspace Members ({members.length})
        </h2>

        <div className="space-y-2.5">
          {members.map((member, idx) => {
            const isSelf = member.id === currentUserId
            const color = MEMBER_COLORS[idx % MEMBER_COLORS.length]
            const isMenuOpen = activeMenuId === member.id

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xs relative"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white shrink-0 ${color}`}
                  >
                    {getMemberInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      {isSelf && (
                        <span className="text-[9px] font-semibold text-gray-400">(You)</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {member.role === 'admin' ? (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300">
                      <Shield className="h-3 w-3" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-[9px] font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                      Member
                    </span>
                  )}

                  {/* Kebab menu (admin actions) */}
                  {isAdmin && !isSelf && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : member.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Member Options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-9 z-30 w-44 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
                            {member.role !== 'admin' && (
                              <button
                                onClick={() => handleMakeAdmin(member)}
                                disabled={actionLoading}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Make Admin</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleRemoveMember(member)}
                              disabled={actionLoading}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              <span>Remove Member</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
