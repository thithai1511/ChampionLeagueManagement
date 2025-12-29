import React, { useState } from 'react'
import { Calendar, Clock, Tag, ArrowRight, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const News = () => {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const categories = [
    { id: 'all', name: t('news.allCategories') },
    { id: 'matches', name: t('news.matches') },
    { id: 'teams', name: t('news.teams') },
    { id: 'players', name: t('news.players') },
    { id: 'draws', name: t('news.draws') },
    { id: 'awards', name: t('news.awards') }
  ]

  const news = [
    {
      id: 1,
      title: 'Liverpool maintain perfect record with victory over Lille',
      summary: 'The Reds secured their sixth consecutive win in the Champions League with a commanding performance at Anfield.',
      category: 'matches',
      date: '2025-01-22',
      time: '23:30',
      image: '🔴',
      featured: true,
      tags: ['Liverpool', 'Lille', 'Match Report']
    },
    {
      id: 2,
      title: 'Barcelona cruise past Atalanta to secure top-eight finish',
      summary: 'Hansi Flick\'s side delivered a masterclass performance to guarantee their place in the Round of 16.',
      category: 'matches',
      date: '2025-01-22',
      time: '23:15',
      image: '🔵',
      featured: true,
      tags: ['Barcelona', 'Atalanta', 'Round of 16']
    },
    {
      id: 3,
      title: 'Champions League knockout phase draw scheduled for Friday',
      summary: 'The draw for the playoff round and Round of 16 will take place at UEFA headquarters in Nyon.',
      category: 'draws',
      date: '2025-01-22',
      time: '14:00',
      image: '🏆',
      featured: false,
      tags: ['Draw', 'Knockout Phase', 'UEFA']
    },
    {
      id: 4,
      title: 'Lewandowski leads Champions League scoring charts',
      summary: 'The Barcelona striker has netted 7 goals in 6 matches, establishing himself as the tournament\'s top scorer.',
      category: 'players',
      date: '2025-01-21',
      time: '16:45',
      image: '⚽',
      featured: false,
      tags: ['Lewandowski', 'Top Scorer', 'Barcelona']
    },
    {
      id: 5,
      title: 'Real Madrid face must-win scenario against Salzburg',
      summary: 'Los Blancos need a victory to secure their place in the playoff round after a disappointing league phase.',
      category: 'teams',
      date: '2025-01-21',
      time: '12:30',
      image: '⚪',
      featured: false,
      tags: ['Real Madrid', 'Salzburg', 'Playoff']
    },
    {
      id: 6,
      title: 'Brest\'s fairy-tale Champions League debut continues',
      summary: 'The French side has exceeded all expectations in their first-ever Champions League campaign.',
      category: 'teams',
      date: '2025-01-20',
      time: '18:20',
      image: '🔵',
      featured: false,
      tags: ['Brest', 'Debut', 'Fairy Tale']
    },
    {
      id: 7,
      title: 'Team of the Week: Matchday 6 selections revealed',
      summary: 'UEFA\'s technical observers have selected the standout performers from the latest round of fixtures.',
      category: 'awards',
      date: '2025-01-20',
      time: '15:00',
      image: '🌟',
      featured: false,
      tags: ['Team of the Week', 'Awards', 'Matchday 6']
    },
    {
      id: 8,
      title: 'Arsenal secure Round of 16 berth with Zagreb victory',
      summary: 'The Gunners booked their place in the knockout rounds with a convincing 3-0 win over Dinamo Zagreb.',
      category: 'matches',
      date: '2025-01-19',
      time: '22:45',
      image: '🔴',
      featured: false,
      tags: ['Arsenal', 'Zagreb', 'Qualification']
    }
  ]

  const filteredNews = news.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const featuredNews = filteredNews.filter(article => article.featured)
  const regularNews = filteredNews.filter(article => !article.featured)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="uefa-container py-8">
      {/* Breadcrumb */}
      <nav className="uefa-breadcrumb">
        <a href="#" className="uefa-breadcrumb-item">Trang chủ</a>
        <span className="uefa-breadcrumb-separator">/</span>
        <a href="#" className="uefa-breadcrumb-item">Champions League</a>
        <span className="uefa-breadcrumb-separator">/</span>
        <span className="text-uefa-dark">Tin tức</span>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="uefa-section-title">Tin tức Giải Bóng Đá Việt Nam</h1>
        <p className="uefa-section-subtitle">
          Tin tức mới nhất, báo cáo trận đấu và cập nhật từ Giải Bóng Đá Việt Nam
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="uefa-filter-tabs">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`uefa-filter-tab ${selectedCategory === category.id ? 'active' : ''}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uefa-gray" />
          <input
            type="text"
            placeholder="Tìm kiếm tin tức..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="uefa-input pl-10"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-4 gap-8">
        {/* News Content */}
        <div className="lg:col-span-3">
          {/* Featured News */}
          {featuredNews.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-uefa-dark">Featured Stories</h2>
                <div className="flex items-center space-x-2 text-uefa-gray text-sm">
                  <TrendingUp size={16} />
                  <span>Trending Now</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featuredNews.map((article) => (
                  <NewsCard key={article.id} article={article} featured={true} />
                ))}
              </div>
            </div>
          )}

          {/* Regular News */}
          {regularNews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-uefa-dark">Latest News</h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="uefa-select text-sm"
                >
                  <option value="latest">Latest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
              <div className="space-y-6">
                {regularNews.map((article) => (
                  <NewsCard key={article.id} article={article} featured={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Topics */}
          <div className="uefa-card p-6">
            <h3 className="font-bold text-uefa-dark mb-4 flex items-center">
              <TrendingUp size={20} className="mr-2 text-uefa-red" />
              Trending Topics
            </h3>
            <div className="space-y-3">
              {['Liverpool Perfect Record', 'Barcelona Qualification', 'Real Madrid Struggles', 'Lewandowski Goals', 'New Format Impact'].map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-uefa-light-gray rounded transition-colors cursor-pointer">
                  <span className="text-uefa-dark text-sm font-medium">#{index + 1} {topic}</span>
                  <span className="text-uefa-gray text-xs">{Math.floor(Math.random() * 50) + 10}K</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Read */}
          <div className="uefa-card p-6">
            <h3 className="font-bold text-uefa-dark mb-4 flex items-center">
              <Eye size={20} className="mr-2 text-uefa-blue" />
              Most Read
            </h3>
            <div className="space-y-4">
              {news.slice(0, 5).map((article, index) => (
                <div key={article.id} className="flex items-start space-x-3 p-2 hover:bg-uefa-light-gray rounded transition-colors cursor-pointer">
                  <span className="text-uefa-blue font-bold text-sm w-6">{index + 1}.</span>
                  <div className="flex-1">
                    <h4 className="text-uefa-dark font-medium text-sm line-clamp-2 hover:text-uefa-blue transition-colors">
                      {article.title}
                    </h4>
                    <div className="text-uefa-gray text-xs mt-1">
                      {formatDate(article.date)} • {Math.floor(Math.random() * 100) + 50}K views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Feed */}
          <div className="uefa-card p-6">
            <h3 className="font-bold text-uefa-dark mb-4">Social Media</h3>
            <div className="space-y-4">
              <div className="p-3 bg-uefa-light-gray rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-uefa-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                    T
                  </div>
                  <span className="text-uefa-dark font-semibold text-sm">@ChampionsLeague</span>
                  <span className="text-uefa-gray text-xs">2h</span>
                </div>
                <p className="text-uefa-dark text-sm">
                  🔴 LIVE: Liverpool leading 2-1 against Lille at Anfield! What a match! #UCL
                </p>
                <div className="flex items-center space-x-4 mt-2 text-uefa-gray text-xs">
                  <span>❤️ 2.1K</span>
                  <span>🔄 856</span>
                  <span>💬 234</span>
                </div>
              </div>
              
              <div className="p-3 bg-uefa-light-gray rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-uefa-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                    I
                  </div>
                  <span className="text-uefa-dark font-semibold text-sm">@UEFA</span>
                  <span className="text-uefa-gray text-xs">4h</span>
                </div>
                <p className="text-uefa-dark text-sm">
                  📊 Lewandowski now leads the scoring charts with 7 goals! Can anyone catch him? #UCL
                </p>
                <div className="flex items-center space-x-4 mt-2 text-uefa-gray text-xs">
                  <span>❤️ 1.8K</span>
                  <span>🔄 642</span>
                  <span>💬 189</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No results message */}
      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📰</div>
          <h3 className="text-xl font-semibold text-uefa-dark mb-2">No news found</h3>
          <p className="text-uefa-gray">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Load More Button */}
      {filteredNews.length > 0 && (
        <div className="text-center mt-12">
          <button className="uefa-btn-primary">
            Load More Articles
          </button>
        </div>
      )}

      {/* Newsletter Signup */}
      <div className="mt-12 pt-8 border-t border-uefa-medium-gray">
        <div className="uefa-card p-8 text-center">
          <h3 className="text-2xl font-bold text-uefa-dark mb-4">Stay Updated</h3>
          <p className="text-uefa-gray mb-6">
            Get the latest Champions League news delivered straight to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="uefa-input flex-1"
            />
            <button className="uefa-btn-primary whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default News
