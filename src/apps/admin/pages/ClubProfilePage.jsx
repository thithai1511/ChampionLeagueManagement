import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Building2, MapPin, Calendar, Users, Phone, Mail, Globe } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import TeamsService from '../../../layers/application/services/TeamsService';
import toast, { Toaster } from 'react-hot-toast';

const ClubProfilePage = ({ currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [teamData, setTeamData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        founded_year: '',
        city: '',
        country: '',
        stadium_name: '',
        stadium_capacity: '',
        phone: '',
        email: '',
        website: '',
        description: ''
    });

    // Get team ID from user's teamIds
    const userTeamIds = currentUser?.teamIds || [];
    const teamId = userTeamIds.length > 0 ? userTeamIds[0] : null;

    useEffect(() => {
        if (!teamId) {
            toast.error('Không tìm thấy đội bóng được gán cho tài khoản này');
            setLoading(false);
            return;
        }

        fetchTeamData();
    }, [teamId]);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const response = await TeamsService.getTeamById(teamId);
            setTeamData(response);
            
            // Populate form
            setFormData({
                name: response.name || '',
                code: response.code || '',
                founded_year: response.founded_year || '',
                city: response.city || '',
                country: response.country || '',
                stadium_name: response.stadium_name || '',
                stadium_capacity: response.stadium_capacity || '',
                phone: response.phone || '',
                email: response.email || '',
                website: response.website || '',
                description: response.description || ''
            });
        } catch (err) {
            console.error('[ClubProfile] Failed to fetch team data:', err);
            toast.error('Không thể tải thông tin đội bóng');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Map frontend field names to backend/database column names
            const payload = {
                name: formData.name,
                code: formData.code || null,
                founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
                city: formData.city || null,
                country: formData.country || null,
                description: formData.description || null,
                stadium_name: formData.stadium_name || null,
                stadium_capacity: formData.stadium_capacity ? parseInt(formData.stadium_capacity) : null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
            };
            
            await TeamsService.updateTeam(teamId, payload);
            toast.success('Cập nhật thông tin đội bóng thành công');
            await fetchTeamData(); // Reload data
        } catch (err) {
            console.error('[ClubProfile] Failed to update team:', err);
            toast.error(err?.message || 'Không thể cập nhật thông tin đội bóng');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (!teamId) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center">
                <AlertCircle className="text-red-600 mr-3" size={24} />
                <div>
                    <h3 className="font-semibold text-red-800">Không có đội bóng</h3>
                    <p className="text-sm text-red-600">Tài khoản của bạn chưa được gán đội bóng nào.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <Toaster position="top-right" />
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Building2 className="mr-3 text-blue-600" size={32} />
                    Hồ sơ Câu lạc bộ
                </h1>
                <p className="text-gray-600 mt-1">Quản lý thông tin chi tiết về đội bóng của bạn</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Basic Information */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                        <Building2 className="mr-2 text-blue-600" size={20} />
                        Thông tin cơ bản
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên đội <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mã đội
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: HNI, SGN"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Calendar className="mr-1" size={14} />
                                Năm thành lập
                            </label>
                            <input
                                type="number"
                                name="founded_year"
                                value={formData.founded_year}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: 1976"
                                min="1800"
                                max={new Date().getFullYear()}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <MapPin className="mr-1" size={14} />
                                Thành phố
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: Hà Nội"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quốc gia
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: Vietnam"
                            />
                        </div>
                    </div>
                </div>

                {/* Stadium Information */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                        <Building2 className="mr-2 text-green-600" size={20} />
                        Sân vận động
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên sân
                            </label>
                            <input
                                type="text"
                                name="stadium_name"
                                value={formData.stadium_name}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: Sân Hàng Đẫy"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Users className="mr-1" size={14} />
                                Sức chứa
                            </label>
                            <input
                                type="number"
                                name="stadium_capacity"
                                value={formData.stadium_capacity}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="VD: 22000"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
                        <Phone className="mr-2 text-purple-600" size={20} />
                        Thông tin liên hệ
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Phone className="mr-1" size={14} />
                                Điện thoại
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="+84 xxx xxx xxx"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Mail className="mr-1" size={14} />
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="contact@club.vn"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Globe className="mr-1" size={14} />
                                Website
                            </label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://club.vn"
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mô tả / Giới thiệu
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Giới thiệu về câu lạc bộ..."
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Đang lưu...</span>
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                <span>Lưu thay đổi</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ClubProfilePage;


