import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Clock, AlertCircle } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import toast from 'react-hot-toast';

const GoalTypeManagement = ({ rulesetId, onGoalTypesChange }) => {
  const [goalTypes, setGoalTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    minuteMin: 0,
    minuteMax: 90,
    isActive: true
  });

  useEffect(() => {
    if (rulesetId) {
      loadGoalTypes();
    }
  }, [rulesetId]);

  const loadGoalTypes = async () => {
    if (!rulesetId) return;
    setLoading(true);
    try {
      const response = await ApiService.get(`/rulesets/${rulesetId}/goal-types?includeInactive=true`);
      setGoalTypes(response.data || []);
      if (onGoalTypesChange) {
        onGoalTypesChange(response.data || []);
      }
    } catch (error) {
      console.error('Error loading goal types:', error);
      toast.error('Không thể tải danh sách loại bàn thắng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Vui lòng nhập mã và tên loại bàn thắng');
      return;
    }

    if (formData.minuteMin > formData.minuteMax) {
      toast.error('Thời gian tối thiểu phải nhỏ hơn hoặc bằng thời gian tối đa');
      return;
    }

    try {
      await ApiService.post(`/rulesets/${rulesetId}/goal-types`, formData);
      toast.success('Tạo loại bàn thắng thành công');
      setShowForm(false);
      resetForm();
      loadGoalTypes();
    } catch (error) {
      console.error('Error creating goal type:', error);
      toast.error(error?.response?.data?.message || 'Không thể tạo loại bàn thắng');
    }
  };

  const handleUpdate = async (id) => {
    if (!formData.code || !formData.name) {
      toast.error('Vui lòng nhập mã và tên loại bàn thắng');
      return;
    }

    if (formData.minuteMin > formData.minuteMax) {
      toast.error('Thời gian tối thiểu phải nhỏ hơn hoặc bằng thời gian tối đa');
      return;
    }

    try {
      await ApiService.put(`/goal-types/${id}`, formData);
      toast.success('Cập nhật loại bàn thắng thành công');
      setEditingId(null);
      resetForm();
      loadGoalTypes();
    } catch (error) {
      console.error('Error updating goal type:', error);
      toast.error(error?.response?.data?.message || 'Không thể cập nhật loại bàn thắng');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc muốn xóa loại bàn thắng "${code}"?`)) {
      return;
    }

    try {
      await ApiService.delete(`/goal-types/${id}`);
      toast.success('Xóa loại bàn thắng thành công');
      loadGoalTypes();
    } catch (error) {
      console.error('Error deleting goal type:', error);
      toast.error(error?.response?.data?.message || 'Không thể xóa loại bàn thắng');
    }
  };

  const startEdit = (goalType) => {
    setEditingId(goalType.goalTypeId);
    setFormData({
      code: goalType.code,
      name: goalType.name,
      description: goalType.description || '',
      minuteMin: goalType.minuteMin,
      minuteMax: goalType.minuteMax,
      isActive: goalType.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      minuteMin: 0,
      minuteMax: 90,
      isActive: true
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setShowForm(false);
    resetForm();
  };

  if (loading && goalTypes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Quản lý loại bàn thắng</h4>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Thêm loại bàn thắng
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-gray-900">
              {editingId ? 'Chỉnh sửa loại bàn thắng' : 'Thêm loại bàn thắng mới'}
            </h5>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã loại <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: OPEN_PLAY"
                maxLength={32}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên loại <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Bóng sống"
                maxLength={100}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả loại bàn thắng"
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian tối thiểu (phút)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.minuteMin}
                onChange={(e) => setFormData({ ...formData, minuteMin: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian tối đa (phút)
              </label>
              <input
                type="number"
                min="0"
                max="150"
                value={formData.minuteMax}
                onChange={(e) => setFormData({ ...formData, minuteMax: parseInt(e.target.value) || 90 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Kích hoạt</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      )}

      {goalTypes.length === 0 && !showForm ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500">Chưa có loại bàn thắng nào</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    Thời gian
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {goalTypes.map((gt) => (
                <tr key={gt.goalTypeId} className={!gt.isActive ? 'bg-gray-50 opacity-75' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{gt.code}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{gt.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{gt.description || '-'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {gt.minuteMin} - {gt.minuteMax} phút
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        gt.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {gt.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(gt)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(gt.goalTypeId, gt.code)}
                        className="text-red-600 hover:text-red-900"
                        title="Xóa"
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
      )}
    </div>
  );
};

export default GoalTypeManagement;


