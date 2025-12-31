// src/apps/public/pages/NewsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Eye, Tag, TrendingUp, Search } from 'lucide-react';
import kyNguyenMoiNews from '../../../data/kyNguyenMoiNews';
import LiveMatchNotifications from '../components/LiveMatchNotifications';

const NewsCard = ({ article, featured = false }) => {
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const categoryColors = {
    matches: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    teams: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    players: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  };

  const categoryLabels = {
    matches: 'Trận đấu',
    teams: 'Đội bóng',
    players: 'Cầu thủ'
  };

  if (featured) {
    return (
      <Link to={`/news/${article.slug}`} className="group block">
        <article className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:-translate-y-2 shadow-2xl">
          <div className="relative h-80 overflow-hidden">
            <img 
              src={article.imageUrl} 
              alt={article.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[article.category]}`}>
                {categoryLabels[article.category]}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(article.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {article.time}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {article.views?.toLocaleString('vi-VN')}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                {article.title}
              </h2>
              <p className="text-slate-300 line-clamp-2 mb-4">{article.excerpt}</p>
              <div className="flex flex-wrap gap-2">
                {article.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs border border-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/news/${article.slug}`} className="group block">
      <article className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:-translate-y-2 h-full flex flex-col">
        <div className="relative h-48 overflow-hidden">
          <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[article.category]}`}>
              {categoryLabels[article.category]}
            </span>
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(article.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {article.time}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {article.views?.toLocaleString('vi-VN')}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors flex-1">
            {article.title}
          </h3>
          <p className="text-slate-300 text-sm line-clamp-3 mb-4">{article.excerpt}</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            {article.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-400 text-xs flex items-center gap-1">
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
};

const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc bài viết theo category và search
  const filteredNews = kyNguyenMoiNews.filter(article => {
    const matchCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const categories = [
    { id: 'all', label: 'Tất cả', icon: TrendingUp },
    { id: 'matches', label: 'Trận đấu', icon: Calendar },
    { id: 'players', label: 'Cầu thủ', icon: Tag },
    { id: 'teams', label: 'Đội bóng', icon: Tag }
  ];

  // Bài viết nổi bật (bài đầu tiên)
  const featuredArticle = filteredNews[0];
  const regularArticles = filteredNews.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-2 h-16 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                Tin Tức <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Kỷ Nguyên Mới</span>
              </h1>
              <p className="text-slate-400 text-lg">Cập nhật tin tức mới nhất về giải đấu</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm tin tức..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2
                      ${selectedCategory === category.id 
                        ? 'bg-cyan-400 text-slate-900' 
                        : 'bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-cyan-400/50'
                      }`}
                  >
                    <Icon size={16} />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - News (2/3 width) */}
          <div className="lg:col-span-2 space-y-12">
            {/* Featured Article */}
            {featuredArticle && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="text-cyan-400" size={24} />
                  <h2 className="text-2xl font-bold text-white">Tin nổi bật</h2>
                </div>
                <NewsCard article={featuredArticle} featured={true} />
              </div>
            )}

            {/* Regular Articles Grid */}
            {regularArticles.length > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-cyan-400 rounded"></div>
                  <h2 className="text-2xl font-bold text-white">Tin tức khác</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {regularArticles.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-xl">Không tìm thấy bài viết nào</p>
              </div>
            ) : null}
          </div>

          {/* Right Column - Live Updates (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Live Match Notifications */}
              <LiveMatchNotifications />

              {/* Stats */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-6">
                  <div className="text-4xl font-bold text-blue-400 mb-2">{kyNguyenMoiNews.length}</div>
                  <div className="text-slate-300 text-sm">Tổng số bài viết</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-6">
                  <div className="text-4xl font-bold text-cyan-400 mb-2">
                    {kyNguyenMoiNews.reduce((sum, article) => sum + (article.views || 0), 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-slate-300 text-sm">Tổng lượt xem</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-6">
                  <div className="text-4xl font-bold text-purple-400 mb-2">12</div>
                  <div className="text-slate-300 text-sm">Đội bóng tham gia</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>
    </div>
  );
};

export default NewsPage;
