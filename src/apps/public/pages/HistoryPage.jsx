import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Star, Award, ArrowLeft, Crown, Target, Globe, Sparkles, Play, X, Zap } from 'lucide-react';

// Import images
import trophyImage from '@/assets/images/cup.avif';
import cupBackground from '@/assets/images/cup_background.avif';
import istanbulImage from '@/assets/images/istalbul.jpg';
import campNouImage from '@/assets/images/Đêm kỳ diệu Camp Nou.webp';
import barcelonaPepImage from '@/assets/images/Barcelona của Pep.jpg';
import celticImage from '@/assets/images/Celtic - Lisbon Lions.jpg';
import realMadridImage from '@/assets/images/Hat-trick Real Madrid.jpg';

// Timeline data with images
const timelineEvents = [
  {
    year: '1955',
    title: 'Khởi đầu huyền thoại',
    description: 'Giải đấu bóng đá quốc gia ra đời với 16 đội tham dự. Câu lạc bộ vô địch mùa giải đầu tiên.',
    highlight: true,
    image: null
  },
  {
    year: '1960',
    title: 'Kỷ nguyên Real Madrid',
    description: 'Real Madrid hoàn thành cú ăn 5 liên tiếp (1956-1960), một kỳ tích chưa từng bị phá vỡ.',
    highlight: false,
    image: null
  },
  {
    year: '1967',
    title: 'Celtic - Lisbon Lions',
    description: 'Celtic trở thành đội bóng Anh Quốc đầu tiên vô địch, với đội hình toàn cầu thủ sinh ra trong bán kính 30 dặm từ Glasgow.',
    highlight: true,
    image: celticImage
  },
  {
    year: '1992',
    title: 'UEFA Champions League',
    description: 'Giải đấu được đổi tên thành UEFA Champions League với format vòng bảng mới.',
    highlight: true,
    image: null
  },
  {
    year: '1999',
    title: 'Đêm kỳ diệu Camp Nou',
    description: 'Manchester United lật ngược tình thế trong 2 phút bù giờ để đánh bại Bayern Munich, hoàn thành cú ăn ba lịch sử.',
    highlight: true,
    image: campNouImage
  },
  {
    year: '2005',
    title: 'Phép màu Istanbul',
    description: 'Liverpool từ 0-3 gỡ hòa 3-3 và thắng AC Milan trên chấm penalty trong trận chung kết được xem là hay nhất lịch sử.',
    highlight: true,
    image: istanbulImage
  },
  {
    year: '2009',
    title: 'Barcelona của Pep',
    description: 'Barcelona dưới thời Pep Guardiola giành cú ăn 6, thiết lập tiêu chuẩn mới cho bóng đá đẹp.',
    highlight: true,
    image: barcelonaPepImage
  },
  {
    year: '2018',
    title: 'Hat-trick Real Madrid',
    description: 'Real Madrid vô địch 3 năm liên tiếp (2016-2018), đội bóng đầu tiên làm được điều này kể từ khi đổi tên giải.',
    highlight: true,
    image: realMadridImage
  },
  {
    year: '2024',
    title: 'Format mới',
    description: 'UEFA áp dụng format "Swiss Model" với 36 đội, mỗi đội đấu 8 trận vòng bảng.',
    highlight: true,
    image: null
  }
];

// Most successful clubs
const topClubs = [
  { name: 'Real Madrid', titles: 15, country: 'Tây Ban Nha' },
  { name: 'AC Milan', titles: 7, country: 'Ý' },
  { name: 'Bayern Munich', titles: 6, country: 'Đức' },
  { name: 'Liverpool', titles: 6, country: 'Anh' },
  { name: 'Barcelona', titles: 5, country: 'Tây Ban Nha' },
];

// Legendary players
const legends = [
  { name: 'Cristiano Ronaldo', goals: 140, apps: 183, achievement: 'Vua phá lưới mọi thời đại' },
  { name: 'Lionel Messi', goals: 129, apps: 163, achievement: '5 Quả bóng vàng' },
  { name: 'Karim Benzema', goals: 90, apps: 152, achievement: 'Vô địch 5 lần' },
  { name: 'Raúl González', goals: 71, apps: 142, achievement: 'Biểu tượng Real Madrid' },
];

const HistoryPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="min-h-screen">
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage.image} 
            alt={selectedImage.title}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-amber-400 font-bold text-lg">{selectedImage.year}</p>
            <h3 className="text-white text-2xl font-bold">{selectedImage.title}</h3>
          </div>
        </div>
      )}

      {/* Hero Section with Trophy Background */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={trophyImage} 
            alt="UEFA Champions League Trophy" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 text-amber-400 text-xs uppercase tracking-[0.3em] font-bold mb-6">
            <Sparkles size={14} />
            Từ 1955 đến nay
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Lịch Sử
            </span>
            <br />
            <span className="text-white">Champions League</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Hành trình gần 70 năm của giải đấu danh giá nhất bóng đá câu lạc bộ thế giới
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-amber-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Về trang chủ</span>
        </Link>
      </div>

      {/* Introduction */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Giải đấu danh giá nhất
              <span className="block text-amber-400">Bóng đá câu lạc bộ</span>
            </h2>
            <p className="text-white/70 leading-relaxed">
              Giải Bóng Đá Việt Nam, tiền thân là Giải Đấu Quốc Gia, được thành lập năm 1955 bởi nhà báo thể thao người Pháp Gabriel Hanot. 
              Từ một giải đấu với 16 đội, nay đã phát triển thành sân chơi của 36 câu lạc bộ hàng đầu Việt Nam.
            </p>
            <p className="text-white/70 leading-relaxed">
              Chiếc cúp "Big Ears" cao 73.5cm, nặng 7.5kg bạc nguyên chất, là biểu tượng cho đỉnh cao vinh quang 
              mà mọi cầu thủ và câu lạc bộ đều khao khát.
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center">
              <Calendar className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-3xl font-black text-white mb-1">69</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Năm lịch sử</p>
            </div>
            <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-3xl font-black text-white mb-1">22</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Đội vô địch</p>
            </div>
            <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center">
              <Globe className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-3xl font-black text-white mb-1">12</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Quốc gia</p>
            </div>
            <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center">
              <Target className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-3xl font-black text-white mb-1">15,000+</p>
              <p className="text-xs uppercase tracking-wider text-white/50">Bàn thắng</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Ultimate Prize - Epic Banner */}
      <section className="relative overflow-hidden my-16">
        {/* Background Image */}
        <div className="relative h-[500px] md:h-[600px]">
          <img 
            src={cupBackground} 
            alt="UEFA Champions League Trophy" 
            className="w-full h-full object-cover"
          />
          
          {/* Animated Light Rays */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-cyan-400/60 via-transparent to-purple-500/60 blur-sm"
              style={{ animation: 'pulse 3s ease-in-out infinite' }}
            />
            <div 
              className="absolute top-0 right-1/3 w-[2px] h-full bg-gradient-to-b from-pink-400/60 via-transparent to-cyan-500/60 blur-sm"
              style={{ animation: 'pulse 3s ease-in-out infinite', animationDelay: '1s' }}
            />
            <div 
              className="absolute top-0 right-1/4 w-[2px] h-full bg-gradient-to-b from-purple-400/60 via-transparent to-pink-500/60 blur-sm"
              style={{ animation: 'pulse 3s ease-in-out infinite', animationDelay: '2s' }}
            />
          </div>

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-[#0a0a1a]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/70 via-transparent to-[#0a0a1a]/70" />
          
          {/* Glow Effect around trophy */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {/* Badge */}
            <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/20 backdrop-blur-sm mb-6">
              <Zap size={16} className="text-cyan-400" />
              <span className="text-white text-xs uppercase tracking-[0.25em] font-bold">Đỉnh cao bóng đá</span>
              <Zap size={16} className="text-purple-400" />
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300">
                THE ULTIMATE
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                PRIZE
              </span>
            </h2>

            {/* Description */}
            <p className="text-white/80 text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
              7.5kg bạc nguyên chất, 74cm chiều cao — biểu tượng của vinh quang tột đỉnh. 
              Chiếc cúp mà mọi cầu thủ đều mơ được <span className="text-cyan-400 font-semibold">nâng cao</span>.
            </p>

            {/* Trophy Stats */}
            <div className="flex flex-wrap justify-center gap-6">
              <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  7.5 KG
                </p>
                <p className="text-white/60 text-xs uppercase tracking-wider">Trọng lượng</p>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  74 CM
                </p>
                <p className="text-white/60 text-xs uppercase tracking-wider">Chiều cao</p>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">
                  €20M
                </p>
                <p className="text-white/60 text-xs uppercase tracking-wider">Giá trị</p>
              </div>
            </div>
          </div>

          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${2 + Math.random() * 4}px`,
                  height: `${2 + Math.random() * 4}px`,
                  background: ['#22d3ee', '#a855f7', '#ec4899', '#fbbf24'][Math.floor(Math.random() * 4)],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.2,
                  animation: `float-particle ${10 + Math.random() * 10}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Moments Gallery */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-red-400 text-xs uppercase tracking-[0.3em] font-bold mb-4">
            <Play size={14} />
            Khoảnh khắc huyền thoại
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Những đêm không thể quên
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timelineEvents.filter(e => e.image).map((event) => (
            <div 
              key={event.year}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3]"
              onClick={() => setSelectedImage(event)}
            >
              {/* Image */}
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 transition-all" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="text-amber-400 text-sm font-bold mb-2">{event.year}</span>
                <h3 className="text-white text-xl font-bold mb-2 group-hover:text-amber-300 transition-colors">
                  {event.title}
                </h3>
                <p className="text-white/70 text-sm line-clamp-2 group-hover:line-clamp-none transition-all">
                  {event.description}
                </p>
              </div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-amber-500/90 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>

              {/* Border glow on hover */}
              <div className="absolute inset-0 rounded-2xl border-2 border-amber-500/0 group-hover:border-amber-500/50 transition-colors" />
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-cyan-400 text-xs uppercase tracking-[0.3em] font-bold mb-4">
            <Calendar size={14} />
            Dòng thời gian
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Những mốc son lịch sử
          </h2>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-cyan-500 to-purple-500" />
          
          {/* Timeline events */}
          <div className="space-y-8">
            {timelineEvents.map((event, index) => (
              <div 
                key={event.year}
                className={`relative flex items-start gap-8 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Year marker */}
                <div className={`absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${
                  event.highlight ? 'bg-amber-400 shadow-lg shadow-amber-500/50' : 'bg-white/30'
                } z-10`} />
                
                {/* Content */}
                <div className={`ml-12 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                  <div 
                    className={`rounded-2xl backdrop-blur-md border transition-all hover:scale-[1.02] overflow-hidden ${
                      event.highlight 
                        ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400/50' 
                        : 'bg-white/[0.05] border-white/[0.1] hover:border-white/20'
                    } ${event.image ? 'cursor-pointer' : ''}`}
                    onClick={() => event.image && setSelectedImage(event)}
                  >
                    {/* Image thumbnail if available */}
                    {event.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-amber-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-amber-500 transition-colors">
                          <Play size={16} className="text-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    
                    {/* Text content */}
                    <div className="p-6 text-left">
                      <span className={`text-sm font-bold ${event.highlight ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {event.year}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-2 mb-2">{event.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Clubs Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-amber-400 text-xs uppercase tracking-[0.3em] font-bold mb-4">
            <Crown size={14} />
            Bảng vàng
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Những đội bóng vĩ đại nhất
          </h2>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {topClubs.map((club, index) => (
            <div 
              key={club.name}
              className={`relative p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center group hover:scale-105 transition-all ${
                index === 0 ? 'md:col-span-1 ring-2 ring-amber-500/50' : ''
              }`}
            >
              {index === 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
              )}
              <p className="text-4xl font-black text-amber-400 mb-2">
                {club.titles}
              </p>
              <h3 className="text-white font-bold mb-1">{club.name}</h3>
              <p className="text-white/50 text-xs">{club.country}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legends Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-purple-400 text-xs uppercase tracking-[0.3em] font-bold mb-4">
            <Star size={14} />
            Huyền thoại
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Những cầu thủ vĩ đại nhất
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {legends.map((player, index) => (
            <div 
              key={player.name}
              className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] hover:border-purple-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <span className="text-xl font-black text-purple-400">#{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-white font-bold">{player.name}</h3>
                  <p className="text-white/50 text-xs">{player.achievement}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-black text-purple-400">
                    {player.goals}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Bàn thắng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-purple-400">
                    {player.apps}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Trận đấu</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl p-8 md:p-12 backdrop-blur-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-white/10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Sẵn sàng theo dõi mùa giải mới?
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Khám phá lịch thi đấu, kết quả trực tiếp và thống kê chi tiết của UEFA Champions League
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/matches" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:from-cyan-400 hover:to-blue-400 transition-all"
            >
              <Calendar size={18} />
              Xem lịch thi đấu
            </Link>
            <Link 
              to="/standings" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all"
            >
              <Trophy size={18} />
              Bảng xếp hạng
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HistoryPage;
