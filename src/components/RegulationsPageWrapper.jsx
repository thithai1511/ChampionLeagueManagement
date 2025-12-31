import React from 'react';
import { useLocation } from 'react-router-dom';
import RegulationsPage from '../pages/RegulationsPage';

/**
 * Wrapper component để điều chỉnh màu sắc của RegulationsPage theo từng app
 */
const RegulationsPageWrapper = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Xác định theme dựa trên pathname
  let theme = {
    headerGradient: 'from-blue-600 to-blue-700',
    iconBg: 'bg-white/20',
    accentColor: 'text-blue-100',
  };

  if (pathname.startsWith('/referee')) {
    theme = {
      headerGradient: 'from-slate-900 to-slate-800',
      iconBg: 'bg-yellow-400/20',
      accentColor: 'text-yellow-400',
      borderColor: 'border-yellow-400',
    };
  } else if (pathname.startsWith('/supervisor')) {
    theme = {
      headerGradient: 'from-purple-900 to-purple-800',
      iconBg: 'bg-indigo-400/20',
      accentColor: 'text-indigo-200',
      borderColor: 'border-indigo-400',
    };
  } else if (pathname.startsWith('/player')) {
    theme = {
      headerGradient: 'from-green-600 to-green-700',
      iconBg: 'bg-white/20',
      accentColor: 'text-green-100',
    };
  } else if (pathname.startsWith('/admin') || pathname.startsWith('/admin-team')) {
    theme = {
      headerGradient: 'from-blue-600 to-blue-700',
      iconBg: 'bg-white/20',
      accentColor: 'text-blue-100',
    };
  }

  return <RegulationsPage theme={theme} />;
};

export default RegulationsPageWrapper;

