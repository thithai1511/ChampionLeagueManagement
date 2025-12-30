import React, { useEffect, useState } from 'react';
import { Bell, Trophy, AlertTriangle, Calendar, Award, Ban, X } from 'lucide-react';

const TeamNotifications = ({ teamId, seasonId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (teamId && seasonId) {
      loadNotifications();
      // Poll for updates every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [teamId, seasonId]);

  const loadNotifications = async () => {
    try {
      // Mock notifications - replace with actual API call
      const mockNotifs = [
        {
          id: 1,
          type: 'ranking',
          title: 'Xếp hạng cập nhật',
          message: 'Đội của bạn đã lên hạng 3 sau chiến thắng 2-1',
          icon: Trophy,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          timestamp: new Date(),
          read: false
        },
        {
          id: 2,
          type: 'suspension',
          title: 'Cầu thủ bị treo giò',
          message: 'Nguyễn Văn A bị treo giò 1 trận do nhận thẻ đỏ',
          icon: Ban,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          timestamp: new Date(Date.now() - 3600000),
          read: false
        },
        {
          id: 3,
          type: 'match',
          title: 'Trận đấu sắp diễn ra',
          message: 'Trận đấu vs Đội B sẽ diễn ra vào 14:00 ngày mai',
          icon: Calendar,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          timestamp: new Date(Date.now() - 7200000),
          read: true
        }
      ];
      
      setNotifications(mockNotifs);
      setUnreadCount(mockNotifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = (notifId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition"
      >
        <Bell size={24} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(notif => {
                const Icon = notif.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                      !notif.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${notif.bgColor}`}>
                        <Icon size={20} className={notif.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getTimeAgo(notif.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Bell size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Không có thông báo mới</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamNotifications;
