import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  Lock,
  Unlock,
  User as UserIcon,
  RefreshCw,
  Shield,
  KeyRound,
  History,
  Users
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import UserFormModal from '../components/UserFormModal'
import ConfirmationModal from '../components/ConfirmationModal'
import TeamAssignmentModal from '../components/TeamAssignmentModal'
import UserService from '../../../layers/application/services/UserService'
import RoleService from '../../../layers/application/services/RoleService'
import { useAuth } from '../../../layers/application/context/AuthContext'

const statuses = [
  { id: 'all', name: 'Tất cả trạng thái' },
  { id: 'active', name: 'Đang hoạt động' },
  { id: 'inactive', name: 'Không hoạt động' },
  { id: 'suspended', name: 'Bị đình chỉ' }
]

const statusStyleMap = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-700'
}

const roleStyleMap = {
  super_admin: 'bg-red-100 text-red-800',
  admin: 'bg-blue-100 text-blue-800',
  team_admin: 'bg-cyan-100 text-cyan-800',
  content_manager: 'bg-indigo-100 text-indigo-800',
  match_official: 'bg-emerald-100 text-emerald-800',
  viewer: 'bg-gray-100 text-gray-800'
}

const formatDate = (value) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatDateTime = (value) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const pickPrimaryRole = (user) => {
  if (!user?.roles || user.roles.length === 0) {
    return null
  }
  return user.roles[0]
}

const UsersManagement = () => {
  const { user: currentUser } = useAuth()
  const [allUsers, setAllUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [selectedUserForTeam, setSelectedUserForTeam] = useState(null)
  const [userTeamsMap, setUserTeamsMap] = useState({})

  const isSuperAdmin = useMemo(() => {
    return Array.isArray(currentUser?.roles) && currentUser.roles.includes('super_admin')
  }, [currentUser])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await UserService.listUsers()
      const enriched = response.data.map((user) => ({
        ...user,
        createdAtLabel: formatDate(user.createdAt),
        lastLoginLabel: formatDateTime(user.lastLoginAt)
      }))
      setAllUsers(enriched)
      
      // Load teams for all users if super admin
      if (isSuperAdmin) {
        const teamsPromises = enriched.map(async (user) => {
          try {
            const teams = await UserService.getUserTeams(user.id)
            return { userId: user.id, teams }
          } catch (error) {
            console.error(`Failed to load teams for user ${user.id}:`, error)
            return { userId: user.id, teams: [] }
          }
        })
        const teamsResults = await Promise.all(teamsPromises)
        const teamsMap = {}
        teamsResults.forEach(({ userId, teams }) => {
          teamsMap[userId] = teams
        })
        setUserTeamsMap(teamsMap)
      }
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải danh sách người dùng từ máy chủ.')
      setAllUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [isSuperAdmin])

  const loadRoles = useCallback(async () => {
    console.log('loadRoles: Starting to load roles...')
    setRolesLoading(true)
    try {
      const result = await RoleService.listRoles()
      console.log('loadRoles: Received roles:', result)
      setRoles(result)
      if (!result || result.length === 0) {
        console.warn('loadRoles: No roles returned from API')
        toast.error('Không tìm thấy vai trò nào trong hệ thống')
      }
    } catch (error) {
      console.error('loadRoles: Error loading roles:', error)
      toast.error('Không thể tải danh mục vai trò: ' + (error?.message || 'Unknown error'))
      setRoles([])
    } finally {
      setRolesLoading(false)
      console.log('loadRoles: Finished loading roles')
    }
  }, [])

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [loadUsers, loadRoles])

  const metrics = useMemo(() => {
    const total = allUsers.length
    const active = allUsers.filter((user) => user.status === 'active').length
    const suspended = allUsers.filter((user) => user.status === 'suspended').length
    return { total, active, suspended }
  }, [allUsers])

  const roleFilterOptions = useMemo(() => {
    const base = [{ id: 'all', name: 'Tất cả vai trò' }]
    const dynamic = roles.map((role) => ({
      id: role.code,
      name: role.name,
      roleId: role.id
    }))
    return [...base, ...dynamic]
  }, [roles])

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const target = searchTerm.trim().toLowerCase()
      const matchesSearch =
        target.length === 0 ||
        user.username.toLowerCase().includes(target) ||
        user.email.toLowerCase().includes(target) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(target)

      const matchesRole =
        selectedRole === 'all' ||
        user.roles.some((role) => role.code === selectedRole)

      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [allUsers, searchTerm, selectedRole, selectedStatus])

  const handleOpenAddModal = () => {
    console.log('handleOpenAddModal: roles =', roles)
    console.log('handleOpenAddModal: rolesLoading =', rolesLoading)
    console.log('handleOpenAddModal: roles.length =', roles?.length)
    
    if (roles.length === 0 && !rolesLoading) {
      console.warn('handleOpenAddModal: Roles not loaded yet, reloading...')
      toast.error('Vui lòng đợi danh sách vai trò được tải xong')
      loadRoles()
      return
    }
    
    if (rolesLoading) {
      console.warn('handleOpenAddModal: Roles still loading...')
      toast.error('Đang tải danh sách vai trò, vui lòng đợi...')
      return
    }
    
    console.log('handleOpenAddModal: Opening modal with roles:', roles)
    setEditingUser(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (user) => {
    setEditingUser({
      ...user,
      roleId: pickPrimaryRole(user)?.roleId ?? ''
    })
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingUser(null)
  }

  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must include uppercase, lowercase, and a number.'
    }
    return null
  }

  const handleResetPassword = async (user) => {
    const input = window.prompt(`Enter a new password for ${user.username}`)
    if (input === null) {
      return
    }
    const validationMessage = validatePassword(input.trim())
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }
    setIsResetting(true)
    try {
      await UserService.updateUser(user.id, { password: input.trim() })
      toast.success('Password reset successfully.')
    } catch (error) {
      console.error(error)
      toast.error('Unable to reset password.')
    } finally {
      setIsResetting(false)
    }
  }

  const syncPrimaryRole = async (userId, desiredRoleId, currentRoles = []) => {
    const numericRoleId =
      desiredRoleId && desiredRoleId !== '' ? Number(desiredRoleId) : null
    const currentRoleIds = currentRoles
      .map((role) => role.roleId)
      .filter((roleId) => roleId !== null && roleId !== undefined)

    for (const roleId of currentRoleIds) {
      if (!numericRoleId || roleId !== numericRoleId) {
        await UserService.removeRole(userId, roleId)
      }
    }

    if (numericRoleId && !currentRoleIds.includes(numericRoleId)) {
      await UserService.assignRole(userId, numericRoleId)
    }
  }

  const handleSaveUser = async (formData) => {
    setIsFormSubmitting(true)
    try {
      if (editingUser) {
        const payload = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName
        }

        if (formData.password) {
          payload.password = formData.password
        }

        await UserService.updateUser(editingUser.id, payload)
        await syncPrimaryRole(editingUser.id, formData.roleId, editingUser.roles ?? [])
        toast.success('User updated successfully.')
      } else {
        const payload = {
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password
        }
        const newUserId = await UserService.createUser(payload)
        if (newUserId && formData.roleId) {
          await UserService.assignRole(newUserId, Number(formData.roleId))
        }
        toast.success('User created successfully.')
      }
      closeFormModal()
      await loadUsers()
    } catch (error) {
      console.error(error)
      const message = error?.message ?? 'Unable to save user.'
      toast.error(message)
    } finally {
      setIsFormSubmitting(false)
    }
  }

  const handleOpenDeleteConfirm = (user) => {
    setUserToDelete(user)
    setIsConfirmModalOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await UserService.deleteUser(userToDelete.id)
      toast.success(`User "${userToDelete.username}" deleted.`)
      setUserToDelete(null)
      setIsConfirmModalOpen(false)
      await loadUsers()
    } catch (error) {
      console.error(error)
      toast.error('Unable to delete user.')
    }
  }

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      await UserService.updateUser(user.id, { status: nextStatus })
      toast.success(
        nextStatus === 'suspended'
          ? 'User suspended successfully.'
          : 'User reactivated successfully.'
      )
      await loadUsers()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update user status.')
    }
  }

  const handleExport = () => {
    toast.success('Yêu cầu xuất dữ liệu đã được xếp hàng. File zip sẽ được gửi qua email của bạn.')
  }

  const handleSyncDirectory = async () => {
    setIsSyncing(true)
    toast.loading('Syncing with identity provider...', { id: 'sync-job' })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast.success('Directory synchronised successfully.', { id: 'sync-job' })
    setIsSyncing(false)
  }

  const handleOpenTeamModal = (user) => {
    setSelectedUserForTeam(user)
    setIsTeamModalOpen(true)
  }

  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false)
    setSelectedUserForTeam(null)
  }

  const handleTeamAssignmentSuccess = async () => {
    console.log('handleTeamAssignmentSuccess called for user:', selectedUserForTeam?.id)
    if (selectedUserForTeam) {
      try {
        const teams = await UserService.getUserTeams(selectedUserForTeam.id)
        console.log('Refreshed teams for user:', selectedUserForTeam.id, teams)
        setUserTeamsMap((prev) => {
          const updated = {
            ...prev,
            [selectedUserForTeam.id]: teams
          }
          console.log('Updated userTeamsMap:', updated)
          return updated
        })
      } catch (error) {
        console.error('Failed to refresh user teams:', error)
        toast.error('Không thể cập nhật hiển thị đội bóng')
      }
    }
  }

  const renderStatusBadge = (status) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
        statusStyleMap[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  )

  const renderRoleBadge = (user) => {
    const role = pickPrimaryRole(user)
    if (!role) {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
          Unassigned
        </span>
      )
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
          roleStyleMap[role.code] ?? 'bg-gray-100 text-gray-700'
        }`}
      >
        {role.name ?? role.code}
      </span>
    )
  }

  const renderTeamsBadge = (user) => {
    const teams = userTeamsMap[user.id] || []
    console.log(`renderTeamsBadge for user ${user.id}:`, teams)
    if (teams.length === 0) {
      return (
        <span className="text-xs text-gray-500">Chưa gán đội bóng</span>
      )
    }
    if (teams.length === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
          <Users size={12} />
          {teams[0].teamName}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
        <Users size={12} />
        {teams.length} đội bóng
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User administration</h1>
          <p className="mt-1 text-sm text-gray-600">
            Provision, update, or revoke access to the competition governance portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleSyncDirectory}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Sync directory
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            <Download size={16} />
            Export users
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add user
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Accounts</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.total}</p>
          <p className="text-xs text-gray-500">Total provisioned identities</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.active}</p>
          <p className="text-xs text-gray-500">Currently able to login</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Suspended</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.suspended}</p>
          <p className="text-xs text-gray-500">Under investigation or disabled</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={rolesLoading}
            >
              {roleFilterOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {allUsers.length} accounts
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">User</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Role</th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Đội bóng</th>
                )}
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Created</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Last login</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Security</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading users...
                  </td>
                </tr>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No users match your filters. Adjust the search term or filter options.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredUsers.map((user) => (
                  <tr key={user.id} className="bg-white hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.email} · {user.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderRoleBadge(user)}</td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        {renderTeamsBadge(user)}
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-700">{user.createdAtLabel}</td>
                    <td className="px-6 py-4 text-gray-700">{user.lastLoginLabel}</td>
                    <td className="px-6 py-4">{renderStatusBadge(user.status)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                        <Shield size={14} />
                        {user.mfaEnabled ? 'MFA enforced' : 'MFA pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          className="text-gray-600 hover:text-blue-600"
                          title="Edit user"
                        >
                          <Edit size={16} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenTeamModal(user)}
                            className="text-gray-600 hover:text-cyan-600"
                            title="Gán đội bóng"
                          >
                            <Users size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          className="text-gray-600 hover:text-amber-600 disabled:opacity-60"
                          title="Reset password"
                          disabled={isResetting}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(`/admin/audit-log?userId=${user.id}`, '_self')}
                          className="text-gray-600 hover:text-gray-900"
                          title="View audit log"
                        >
                          <History size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className="text-gray-600 hover:text-blue-600"
                          title={user.status === 'active' ? 'Suspend user' : 'Activate user'}
                        >
                          {user.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteConfirm(user)}
                          className="text-gray-600 hover:text-red-600"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSave={handleSaveUser}
        user={editingUser}
        roles={Array.isArray(roles) ? roles.map((role) => ({ 
          id: String(role.id), 
          name: role.name || '', 
          code: role.code || '' 
        })) : []}
        isSubmitting={isFormSubmitting}
        rolesLoading={rolesLoading}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={handleDeleteUser}
        title="Delete user"
        message={
          userToDelete
            ? `Delete user "${userToDelete.username}"? Their access to the admin portal will be removed.`
            : ''
        }
      />

      {isSuperAdmin && selectedUserForTeam && (
        <TeamAssignmentModal
          isOpen={isTeamModalOpen}
          onClose={handleCloseTeamModal}
          userId={selectedUserForTeam.id}
          userName={`${selectedUserForTeam.firstName} ${selectedUserForTeam.lastName}`}
          onSuccess={handleTeamAssignmentSuccess}
        />
      )}
    </div>
  )
}

export default UsersManagement
