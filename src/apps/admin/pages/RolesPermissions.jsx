import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, CheckCircle2, AlertCircle, Save, RefreshCw, ShieldCheck, Lock, Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import RoleService from '../../../layers/application/services/RoleService'
import PermissionService from '../../../layers/application/services/PermissionService'

const RolesPermissions = () => {
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [permissionCatalog, setPermissionCatalog] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshingAssignments, setIsRefreshingAssignments] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const loadReferenceData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [roleList, permissionList] = await Promise.all([
        RoleService.listRoles().catch(() => []),
        PermissionService.listPermissions().catch(() => [])
      ])
      setRoles(roleList || [])
      setPermissionCatalog(permissionList || [])
      if (roleList && roleList.length > 0) {
        setSelectedRoleId((prev) => prev ?? roleList[0].id)
      }
    } catch (error) {
      console.error('Error loading roles/permissions:', error)
      setLoadError('Không thể tải danh sách vai trò hoặc quyền hạn. Vui lòng thử lại.')
      toast.error('Không thể tải dữ liệu vai trò và quyền hạn.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadAssignments = useCallback(
    async (roleId) => {
      if (!roleId) {
        setSelectedPermissions([])
        return
      }
      setIsRefreshingAssignments(true)
      try {
        const assignments = await RoleService.getRolePermissions(roleId)
        setSelectedPermissions(assignments ? assignments.map((permission) => permission.id) : [])
      } catch (error) {
        console.error('Error loading role permissions:', error)
        // Don't show error toast if it's a 404 - role might not have any permissions yet
        if (error?.response?.status !== 404) {
          toast.error('Không thể tải quyền hạn của vai trò.')
        }
        setSelectedPermissions([])
      } finally {
        setIsRefreshingAssignments(false)
      }
    },
    []
  )

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    if (selectedRoleId) {
      loadAssignments(selectedRoleId)
    }
  }, [selectedRoleId, loadAssignments])

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

  const togglePermission = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    )
  }

  const handleSelectAll = () => {
    setSelectedPermissions(permissionCatalog.map((permission) => permission.id))
  }

  const handleClearAll = () => {
    setSelectedPermissions([])
  }

  const handleSave = async () => {
    if (!selectedRoleId) {
      return
    }
    setIsSaving(true)
    try {
      await RoleService.setRolePermissions(selectedRoleId, selectedPermissions)
      toast.success('Đã cập nhật quyền hạn cho vai trò.')
    } catch (error) {
      console.error('Error saving role permissions:', error)
      toast.error('Không thể cập nhật quyền hạn vai trò. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Shield size={16} />
            Quản lý phân quyền
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Vai trò & Quyền hạn</h1>
          <p className="text-sm text-gray-600">
            Gán quyền hạn chi tiết cho từng vai trò quản trị viên trong hệ thống.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadReferenceData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedRoleId || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </header>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{loadError}</span>
          <button 
            onClick={loadReferenceData} 
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Danh sách vai trò</p>
              <p className="text-xs text-gray-500">Chọn một vai trò để quản lý quyền hạn</p>
            </div>
            <ul className="max-h-[480px] divide-y divide-gray-100 overflow-y-auto">
              {isLoading && (
                <li className="px-5 py-4 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Đang tải vai trò...
                </li>
              )}
              {!isLoading &&
                roles.map((role) => (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${
                        selectedRoleId === role.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <ShieldCheck
                        size={18}
                        className={
                          selectedRoleId === role.id ? 'text-blue-600' : 'text-gray-400'
                        }
                      />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {role.name}{' '}
                          {role.isSystemRole && (
                            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                              System
                            </span>
                          )}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{role.code}</p>
                      </div>
                    </button>
                  </li>
                ))}
              {!isLoading && roles.length === 0 && (
                <li className="px-5 py-4 text-sm text-gray-500">Không tìm thấy vai trò nào.</li>
              )}
            </ul>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {!selectedRole && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                <AlertCircle size={18} />
                Chọn một vai trò từ danh sách bên trái để xem quyền hạn.
              </div>
            )}

            {selectedRole && (
              <>
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{selectedRole.name}</p>
                    <p className="text-sm text-gray-500">
                      Quản lý quyền hạn cho <span className="font-mono">{selectedRole.code}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                      <CheckCircle2 size={14} />
                      {selectedPermissions.length} được cấp
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                      <Lock size={14} />
                      {permissionCatalog.length - selectedPermissions.length} bị hạn chế
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={permissionCatalog.length === 0}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={selectedPermissions.length === 0}
                  >
                    Bỏ chọn tất cả
                  </button>
                  {isRefreshingAssignments && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
                      <Loader2 size={14} className="animate-spin" />
                      Đang đồng bộ...
                    </span>
                  )}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {permissionCatalog.map((permission) => {
                    const isChecked = selectedPermissions.includes(permission.id)
                    return (
                      <label
                        key={permission.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition ${
                          isChecked ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={isChecked}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{permission.name}</p>
                          <p className="text-xs uppercase tracking-wide text-gray-400">{permission.code}</p>
                          {permission.description && (
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                  {!isLoading && permissionCatalog.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Không tìm thấy quyền hạn nào trong hệ thống. Vui lòng thêm quyền hạn trước khi gán cho vai trò.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default RolesPermissions
