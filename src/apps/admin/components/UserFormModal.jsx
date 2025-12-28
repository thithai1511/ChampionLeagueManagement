import React, { useState, useEffect } from 'react'
import { toRoleLabel } from '../../../shared/utils/vi'

const UserFormModal = ({ isOpen, onClose, onSave, user, roles = [], isSubmitting = false, rolesLoading = false }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    password: ''
  })
  const [errors, setErrors] = useState([])

  const isEditing = !!user

  useEffect(() => {
    if (isOpen) {
      setErrors([])
      if (isEditing) {
        setFormData({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId ?? '',
          password: ''
        })
      } else {
        setFormData({ username: '', email: '', firstName: '', lastName: '', roleId: '', password: '' })
      }
    }
  }, [user, isEditing, isOpen])

  // Debug: Log roles when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('UserFormModal - Roles received:', roles)
      console.log('UserFormModal - Roles length:', roles?.length)
    }
  }, [isOpen, roles])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationMessages = []
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      validationMessages.push('Vui lòng nhập đầy đủ họ và tên.')
    }
    if (!formData.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
      validationMessages.push('Vui lòng nhập email hợp lệ.')
    }
    if (!isEditing && !formData.username.trim()) {
      validationMessages.push('Vui lòng nhập tên đăng nhập.')
    }
    if (!formData.roleId) {
      validationMessages.push('Vui lòng chọn vai trò.')
    }
    if (!isEditing || formData.password) {
      const pwd = formData.password
      if (!pwd || pwd.length < 8) {
        validationMessages.push('Mật khẩu phải có ít nhất 8 ký tự.')
      }
      if (pwd && (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd))) {
        validationMessages.push('Mật khẩu phải có chữ hoa, chữ thường và số.')
      }
    }

    if (validationMessages.length > 0) {
      setErrors(validationMessages)
      return
    }
    setErrors([])
    onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative z-50">
        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Sửa người dùng' : 'Thêm người dùng mới'}</h2>
        {errors.length > 0 && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input 
              name="firstName" 
              value={formData.firstName} 
              onChange={handleChange} 
              placeholder="Họ" 
              className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <input 
              name="lastName" 
              value={formData.lastName} 
              onChange={handleChange} 
              placeholder="Tên" 
              className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
          </div>
          <input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Tên đăng nhập"
            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
            disabled={isEditing}
          />
          <input 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
            placeholder="Email" 
            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            required 
          />
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEditing ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu'}
            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={!isEditing}
          />
          <div className="relative">
            <select 
              name="roleId" 
              value={formData.roleId} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={rolesLoading || !roles || roles.length === 0}
            >
              <option value="" disabled>
                {rolesLoading ? 'Đang tải vai trò...' : (roles && roles.length > 0 ? 'Chọn vai trò' : 'Không có vai trò nào')}
              </option>
              {!rolesLoading && roles && roles.length > 0 && (
                roles.map((role) => {
                  const roleLabel = toRoleLabel(role) || role.name || `Role ${role.id}`
                  return (
                    <option key={role.id} value={role.id}>
                      {roleLabel}
                    </option>
                  )
                })
              )}
            </select>
            {rolesLoading && (
              <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                <span className="animate-spin">⏳</span>
                Đang tải danh sách vai trò...
              </div>
            )}
            {!rolesLoading && roles && roles.length === 0 && (
              <div className="mt-1 text-xs text-red-600">
                ⚠️ Không có vai trò nào. Vui lòng kiểm tra lại.
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserFormModal
