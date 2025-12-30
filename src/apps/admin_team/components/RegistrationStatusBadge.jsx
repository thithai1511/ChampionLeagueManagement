import React from 'react';

const RegistrationStatusBadge = ({ status = 'pending' }) => {
    const styles = {
        pending: 'bg-yellow-900/30 text-yellow-500 border-yellow-800',
        approved: 'bg-green-900/30 text-green-500 border-green-800',
        rejected: 'bg-red-900/30 text-red-500 border-red-800',
    };

    const labels = {
        pending: 'Đang chờ duyệt',
        approved: 'Đã duyệt',
        rejected: 'Bị từ chối',
    };

    const currentStatus = status.toLowerCase();
    const className = styles[currentStatus] || styles.pending;
    const label = labels[currentStatus] || labels.pending;

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
            {label}
        </span>
    );
};

export default RegistrationStatusBadge;
