import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, ArrowRight, Trophy, Star } from 'lucide-react';
import footerBg from '@/assets/images/footter.jpg';

const footerLinks = {
  competitions: [
    { name: 'Champions League', to: '/standings' },
    { name: 'Lịch thi đấu', to: '/match-center' },
    { name: 'Đội bóng', to: '/teams' },
    { name: 'Lịch sử', to: '/history' },
  ],
  about: [
    { name: 'Về chúng tôi', to: '#' },
    { name: 'Liên hệ', to: '#' },
    { name: 'Điều khoản', to: '#' },
    { name: 'Quyền riêng tư', to: '#' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

const PublicFooter = () => {
  return (
    <footer className="relative mt-20">
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src={footerBg} 
          alt="" 
          className="w-full h-full object-cover object-top"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/90 to-[#0a0a1a]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/80 via-transparent to-[#0a0a1a]/80" />
      </div>
      
      {/* Main footer content */}
      <div className="relative">
        {/* Top CTA Section */}
        <div className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                  <Star size={14} className="text-amber-400" />
                  <span className="text-white text-xs uppercase tracking-[0.2em] font-bold">Trải nghiệm đỉnh cao</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white">
                  Theo dõi những <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">ngôi sao sáng nhất</span>
                </h3>
              </div>
              
              {/* Newsletter */}
              <div className="flex gap-2 w-full md:w-auto">
                <input 
                  type="email" 
                  placeholder="Nhập email của bạn" 
                  className="flex-1 md:w-64 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all whitespace-nowrap">
                  Đăng ký
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Links Section */}
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-2xl">
                    KỶ NGUYÊN MỚI
                  </p>
                  <p className="text-cyan-400 text-sm font-medium">Liên đoàn bóng đá Việt Nam</p>
                </div>
              </div>
              
              <p className="text-white/70 text-sm leading-relaxed max-w-md">
                Nơi những ngôi sao sáng nhất Việt Nam cùng tranh tài. Theo dõi lịch thi đấu, 
                kết quả trực tiếp và thống kê chi tiết từ giải đấu danh giá nhất thế giới.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-500 hover:border-transparent transition-all group"
                  >
                    <social.icon size={18} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Column 1 */}
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
                Khám phá
              </h4>
              <ul className="space-y-3">
                {footerLinks.competitions.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.to} 
                      className="text-white/60 hover:text-cyan-400 text-sm transition-colors inline-flex items-center gap-2 group"
                    >
                      {link.name}
                      <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Column 2 */}
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full" />
                Thông tin
              </h4>
              <ul className="space-y-3">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.to} 
                      className="text-white/60 hover:text-cyan-400 text-sm transition-colors inline-flex items-center gap-2 group"
                    >
                      {link.name}
                      <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Copyright */}
              <p className="text-white/50 text-sm">
                © 2026 KỶ NGUYÊN MỚI. All rights reserved.
              </p>

              {/* Bottom Links */}
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-white/50 hover:text-white transition-colors">Chính sách</a>
                <span className="text-white/20">|</span>
                <a href="#" className="text-white/50 hover:text-white transition-colors">Điều khoản</a>
                <span className="text-white/20">|</span>
                <a href="#" className="text-white/50 hover:text-white transition-colors">Cookie</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
