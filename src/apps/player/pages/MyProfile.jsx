import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Flag,
  Award,
  Ruler,
  Weight,
  Shield,
  Edit,
  Camera
} from 'lucide-react';
import { useAuth } from '@/layers/application/context/AuthContext';
import apiClient from '@/layers/infrastructure/api/apiClient';

const MyProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/player-portal/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Fallback to mock data for demo
      setProfile({
        fullName: user?.fullName || 'Nguyễn Văn A',
        email: user?.email || 'player@example.com',
        phone: '0987654321',
        dateOfBirth: '1998-05-15',
        placeOfBirth: 'Hà Nội, Việt Nam',
        nationality: 'Việt Nam',
        position: 'Tiền đạo',
        jerseyNumber: 10,
        height: 175,
        weight: 70,
        teamName: 'CLB Hà Nội',
        teamLogo: null,
        contractStart: '2024-01-01',
        contractEnd: '2026-12-31',
        previousClubs: ['CLB HAGL', 'CLB Viettel'],
        achievements: [
          'Vua phá lưới V.League 2023',
          'Cầu thủ xuất sắc nhất tháng 5/2024',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-medium text-gray-900">{value || 'Chưa cập nhật'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của tôi</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200">
          <Edit className="w-4 h-4" />
          <span>Chỉnh sửa</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-green-600 to-green-700 relative">
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center relative group">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
              <button className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-20 px-8 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile?.fullName}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  {profile?.position}
                </span>
                <span className="font-bold text-green-600">#{profile?.jerseyNumber}</span>
                <span>{profile?.teamName}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Ruler className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Chiều cao</p>
              <p className="text-xl font-bold text-gray-900">{profile?.height} cm</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Weight className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Cân nặng</p>
              <p className="text-xl font-bold text-gray-900">{profile?.weight} kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Calendar className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Tuổi</p>
              <p className="text-xl font-bold text-gray-900">
                {new Date().getFullYear() - new Date(profile?.dateOfBirth).getFullYear()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Flag className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Quốc tịch</p>
              <p className="text-xl font-bold text-gray-900">{profile?.nationality}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin cá nhân</h3>
          <div className="space-y-1">
            <InfoRow icon={User} label="Họ và tên" value={profile?.fullName} />
            <InfoRow icon={Mail} label="Email" value={profile?.email} />
            <InfoRow icon={Phone} label="Số điện thoại" value={profile?.phone} />
            <InfoRow 
              icon={Calendar} 
              label="Ngày sinh" 
              value={new Date(profile?.dateOfBirth).toLocaleDateString('vi-VN')} 
            />
            <InfoRow icon={MapPin} label="Nơi sinh" value={profile?.placeOfBirth} />
            <InfoRow icon={Flag} label="Quốc tịch" value={profile?.nationality} />
          </div>
        </div>

        {/* Career Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin sự nghiệp</h3>
          <div className="space-y-1">
            <InfoRow icon={Shield} label="CLB hiện tại" value={profile?.teamName} />
            <InfoRow icon={User} label="Vị trí" value={profile?.position} />
            <InfoRow icon={Award} label="Số áo" value={`#${profile?.jerseyNumber}`} />
            <InfoRow 
              icon={Calendar} 
              label="Hợp đồng" 
              value={`${new Date(profile?.contractStart).getFullYear()} - ${new Date(profile?.contractEnd).getFullYear()}`} 
            />
          </div>

          {/* Previous Clubs */}
          {profile?.previousClubs && profile.previousClubs.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">CLB từng khoác áo</p>
              <div className="flex flex-wrap gap-2">
                {profile.previousClubs.map((club, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {club}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {profile?.achievements && profile.achievements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Danh hiệu & Thành tích</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.achievements.map((achievement, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900">{achievement}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
