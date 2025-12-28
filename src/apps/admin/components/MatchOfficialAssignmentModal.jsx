import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  UserCheck,
  Award,
  Users,
  Loader,
  CheckCircle,
  AlertCircle,
  Save,
  Trash2
} from 'lucide-react';
import OfficialService from '../../../layers/application/services/OfficialService';

const ROLE_CONFIG = [
  { code: 'referee', label: 'Trọng tài chính', icon: Shield, color: 'blue', required: true },
  { code: 'assistant_1', label: 'Trọng tài biên 1', icon: UserCheck, color: 'green', required: true },
  { code: 'assistant_2', label: 'Trọng tài biên 2', icon: UserCheck, color: 'green', required: true },
  { code: 'fourth_official', label: 'Trọng tài thứ 4', icon: Users, color: 'yellow', required: false },
  { code: 'match_commissioner', label: 'Giám sát trận đấu', icon: Award, color: 'purple', required: true },
  { code: 'video_assistant', label: 'VAR', icon: Shield, color: 'cyan', required: false },
];

const MatchOfficialAssignmentModal = ({ isOpen, onClose, match, onSuccess }) => {
  const [assignments, setAssignments] = useState({});
  const [availableOfficials, setAvailableOfficials] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadAssignments = useCallback(async () => {
    if (!match?.matchId) return;
    
    setIsLoading(true);
    try {
      const response = await OfficialService.getMatchOfficials(match.matchId);
      const assignmentMap = {};
      (response.data || []).forEach(a => {
        assignmentMap[a.roleCode] = a;
      });
      setAssignments(assignmentMap);
    } catch (err) {
      setError('Không thể tải danh sách phân công: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [match?.matchId]);

  const loadAvailableOfficials = useCallback(async () => {
    try {
      const response = await OfficialService.listOfficials({ status: 'active' });
      setAvailableOfficials(response.data || []);
    } catch (err) {
      console.error('Failed to load officials:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && match) {
      loadAssignments();
      loadAvailableOfficials();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, match, loadAssignments, loadAvailableOfficials]);

  const handleAssignOfficial = async (roleCode, officialId) => {
    if (!officialId) {
      // Remove assignment
      setIsSaving(true);
      try {
        await OfficialService.removeOfficialFromMatch(match.matchId, roleCode);
        setAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[roleCode];
          return newAssignments;
        });
        setSuccess('Đã hủy phân công');
      } catch (err) {
        setError('Không thể hủy phân công: ' + err.message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await OfficialService.assignOfficialToMatch(match.matchId, {
        officialId: parseInt(officialId),
        roleCode,
      });
      
      setAssignments(prev => ({
        ...prev,
        [roleCode]: response.data,
      }));
      setSuccess('Đã phân công thành công');
    } catch (err) {
      setError(err.message || 'Không thể phân công');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = () => {
    setSuccess('Đã lưu tất cả phân công');
    onSuccess?.();
    onClose();
  };

  const getOfficialName = (officialId) => {
    const official = availableOfficials.find(o => o.officialId === officialId);
    return official?.fullName || '';
  };

  const getRoleIcon = (roleConfig, isAssigned) => {
    const Icon = roleConfig.icon;
    const colorMap = {
      blue: isAssigned ? 'text-blue-600 bg-blue-100' : 'text-blue-400 bg-blue-50',
      green: isAssigned ? 'text-green-600 bg-green-100' : 'text-green-400 bg-green-50',
      yellow: isAssigned ? 'text-yellow-600 bg-yellow-100' : 'text-yellow-400 bg-yellow-50',
      purple: isAssigned ? 'text-purple-600 bg-purple-100' : 'text-purple-400 bg-purple-50',
      cyan: isAssigned ? 'text-cyan-600 bg-cyan-100' : 'text-cyan-400 bg-cyan-50',
    };
    return (
      <div className={`p-2 rounded-lg ${colorMap[roleConfig.color]}`}>
        <Icon size={20} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Shield size={20} />
                Phân Công Trọng Tài
              </h3>
              {match && (
                <p className="text-blue-100 text-sm mt-1">
                  {match.homeTeamName} vs {match.awayTeamName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Alerts */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle size={18} />
                <span>{success}</span>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-blue-600" size={32} />
                <span className="ml-3 text-gray-600">Đang tải...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {ROLE_CONFIG.map((role) => {
                  const assignment = assignments[role.code];
                  const isAssigned = !!assignment;

                  return (
                    <div
                      key={role.code}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isAssigned
                          ? 'border-green-200 bg-green-50/50'
                          : role.required
                          ? 'border-orange-200 bg-orange-50/30'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRoleIcon(role, isAssigned)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {role.label}
                              </span>
                              {role.required && (
                                <span className="text-xs text-red-500">*</span>
                              )}
                            </div>
                            {isAssigned && (
                              <div className="text-sm text-gray-600 mt-0.5">
                                {assignment.officialName}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={assignment?.officialId || ''}
                            onChange={(e) => handleAssignOfficial(role.code, e.target.value)}
                            disabled={isSaving}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                          >
                            <option value="">-- Chọn trọng tài --</option>
                            {availableOfficials.map((official) => (
                              <option key={official.officialId} value={official.officialId}>
                                {official.fullName} ({official.roleSpecialty})
                              </option>
                            ))}
                          </select>

                          {isAssigned && (
                            <button
                              onClick={() => handleAssignOfficial(role.code, null)}
                              disabled={isSaving}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hủy phân công"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-700 mb-2">Tổng kết phân công</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Đã phân công: {Object.keys(assignments).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>
                    Còn thiếu: {ROLE_CONFIG.filter(r => r.required && !assignments[r.code]).length} bắt buộc
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Hoàn tất
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchOfficialAssignmentModal;

