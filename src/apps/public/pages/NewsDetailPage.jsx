import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Eye, Tag, User, Share2, Facebook, Twitter } from 'lucide-react';
import kyNguyenMoiNews from '../../../data/kyNguyenMoiNews';

const NewsDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // Tìm bài viết theo slug
  const article = kyNguyenMoiNews.find(news => news.slug === slug);
  
  // Scroll to top khi load trang
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  
  // Nếu không tìm thấy bài viết
  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Không tìm thấy bài viết</h1>
          <Link to="/news" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 justify-center">
            <ArrowLeft size={20} />
            Quay lại trang tin tức
          </Link>
        </div>
      </div>
    );
  }

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

  // Bài viết liên quan (lấy 3 bài khác cùng category)
  const relatedArticles = kyNguyenMoiNews
    .filter(news => news.id !== article.id && news.category === article.category)
    .slice(0, 3);

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = article.title;
    
    switch(platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      default:
        // Copy link
        navigator.clipboard.writeText(url);
        alert('Đã sao chép link bài viết!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/news')}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-6 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại trang tin tức
        </button>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto">
          {/* Category và Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[article.category]}`}>
              {categoryLabels[article.category]}
            </span>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {formatDate(article.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} />
                {article.time}
              </span>
              <span className="flex items-center gap-2">
                <Eye size={16} />
                {article.views?.toLocaleString('vi-VN') || 0} lượt xem
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-slate-300 mb-6 leading-relaxed border-l-4 border-cyan-400 pl-6 italic">
            {article.excerpt}
          </p>

          {/* Author & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-400">
              <User size={16} />
              <span className="text-sm">Tác giả: <span className="text-white font-medium">{article.author}</span></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-slate-800/50 text-slate-300 text-xs border border-slate-700 flex items-center gap-1">
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Featured Image */}
          <div className="mb-10 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={article.imageUrl} 
              alt={article.title} 
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Article Content */}
          <div 
            className="prose prose-invert prose-lg max-w-none mb-12
              prose-headings:text-white prose-headings:font-bold
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-cyan-400/30 prose-h2:pb-3
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-cyan-400
              prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:text-slate-300 prose-ul:my-6
              prose-li:my-2
              prose-blockquote:border-l-4 prose-blockquote:border-cyan-400 prose-blockquote:pl-6 
              prose-blockquote:italic prose-blockquote:text-slate-300 prose-blockquote:bg-slate-800/30 
              prose-blockquote:py-4 prose-blockquote:rounded-r-lg prose-blockquote:my-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Share Buttons */}
          <div className="flex items-center justify-center gap-4 py-8 border-y border-slate-700 mb-12">
            <span className="text-slate-400 flex items-center gap-2">
              <Share2 size={20} />
              Chia sẻ bài viết:
            </span>
            <button
              onClick={() => handleShare('facebook')}
              className="p-3 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all hover:scale-110"
            >
              <Facebook size={20} />
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="p-3 rounded-full bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 transition-all hover:scale-110"
            >
              <Twitter size={20} />
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="px-4 py-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all text-sm"
            >
              Sao chép link
            </button>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-cyan-400 rounded"></span>
                Tin liên quan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map(related => (
                  <Link
                    key={related.id}
                    to={`/news/${related.slug}`}
                    className="group"
                  >
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:-translate-y-1">
                      <img 
                        src={related.imageUrl} 
                        alt={related.title} 
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="p-4">
                        <p className="text-sm text-slate-400 mb-2">{formatDate(related.date)}</p>
                        <h3 className="text-white font-semibold line-clamp-2 group-hover:text-cyan-400 transition-colors">
                          {related.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default NewsDetailPage;
