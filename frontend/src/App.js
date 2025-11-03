import React, { useState, useEffect } from 'react';
import './App.css';
import * as animeApi from './api/anime';

// Components
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import AnimeDetailModal from './components/AnimeDetailModal';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import MyPage from './pages/MyPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);
  
  // Data states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [popularAnimes, setPopularAnimes] = useState([]);
  const [myFavorites, setMyFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Filter state
  const [filter, setFilter] = useState({
    genre: '전체',
    sort: 'popular',
    minScore: 0
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      loadUserInfo();
      loadMyData();
    }
    loadPopularAnimes();
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await animeApi.getMyInfo();
      setUserEmail(response.data.email);
    } catch (error) {
      console.error('사용자 정보 로드 실패');
    }
  };

  const loadPopularAnimes = async () => {
    try {
      const response = await animeApi.getPopularAnimes();
      setPopularAnimes(response.data);
    } catch (error) {
      console.error('인기 애니 로드 실패');
    }
  };

  const loadMyData = async () => {
    try {
      const favs = await animeApi.getFavorites();
      setMyFavorites(favs.data);
      
      const recs = await animeApi.getPersonalRecommendations();
      setRecommendations(recs.data);
    } catch (error) {
      console.error('데이터 로드 실패');
    }
  };

  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    setLoading(true);
    try {
      const response = await animeApi.searchAnime(keyword);
      setSearchResults(response.data);
      setCurrentPage('search');
    } catch (error) {
      console.error('검색 실패');
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    try {
      await animeApi.login(email, password);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      loadUserInfo();
      loadMyData();
    } catch (error) {
      throw new Error('로그인에 실패했습니다');
    }
  };

  const handleRegister = async (email, password) => {
    try {
      await animeApi.register(email, password);
      return true;
    } catch (error) {
      throw new Error('회원가입에 실패했습니다');
    }
  };

  const handleLogout = () => {
    animeApi.logout();
    setIsLoggedIn(false);
    setUserEmail('');
    setMyFavorites([]);
    setRecommendations([]);
    setCurrentPage('home');
  };

  const handleAddFavorite = async (anime) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    try {
      await animeApi.addFavorite(
        anime.anime_id || anime.mal_id,
        anime.title,
        anime.image_url || anime.images?.jpg?.image_url
      );
      loadMyData();
    } catch (error) {
      console.error('즐겨찾기 추가 실패');
    }
  };

  const handleRemoveFavorite = async (animeId) => {
    try {
      await animeApi.removeFavorite(animeId);
      loadMyData();
    } catch (error) {
      console.error('즐겨찾기 삭제 실패');
    }
  };

  const handleGetRecommendations = async (title) => {
    setLoading(true);
    try {
      const response = await animeApi.getRecommendations(title);
      setRecommendations(response.data);
      setCurrentPage('recommendations');
    } catch (error) {
      console.error('추천 받기 실패');
    }
    setLoading(false);
  };

  const isFavorite = (animeId) => {
    return myFavorites.some(fav => fav.anime_id === animeId);
  };

  const handleShowDetail = (animeId) => {
    setSelectedAnimeId(animeId);
  };

  const handleCloseDetail = () => {
    setSelectedAnimeId(null);
  };

  return (
    <div className="app">
      {/* Header */}
      <Header
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        onShowLogin={() => setShowLoginModal(true)}
      />

      {/* Main Content */}
      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}

        {/* Home Page */}
        {currentPage === 'home' && (
          <Home
            popularAnimes={popularAnimes}
            recommendations={recommendations}
            isLoggedIn={isLoggedIn}
            isFavorite={isFavorite}
            onSearch={handleSearch}
            onAddFavorite={handleAddFavorite}
            onRemoveFavorite={handleRemoveFavorite}
            onGetRecommendations={handleGetRecommendations}
            onShowDetail={handleShowDetail}
            onShowLogin={() => setShowLoginModal(true)}
          />
        )}

        {/* Search Page */}
        {currentPage === 'search' && (
          <Search
            searchKeyword={searchKeyword}
            searchResults={searchResults}
            filter={filter}
            isFavorite={isFavorite}
            onSearch={handleSearch}
            onFilterChange={setFilter}
            onAddFavorite={handleAddFavorite}
            onRemoveFavorite={handleRemoveFavorite}
            onGetRecommendations={handleGetRecommendations}
            onShowDetail={handleShowDetail}
            loading={loading}
          />
        )}

        {/* Popular Page */}
        {currentPage === 'popular' && (
          <div className="page">
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">인기 애니메이션</h2>
                <p className="section-subtitle">전체 {popularAnimes.length}개</p>
              </div>
              <div className="anime-grid">
                {popularAnimes.map((anime) => (
                  <div key={anime.anime_id}>
                    {/* AnimeCard 사용 */}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Favorites Page */}
        {currentPage === 'favorites' && (
          <div className="page">
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">즐겨찾기</h2>
                <p className="section-subtitle">{myFavorites.length}개</p>
              </div>
              {myFavorites.length > 0 ? (
                <div className="anime-grid">
                  {/* Render favorites */}
                </div>
              ) : (
                <div className="empty-state">
                  <p>즐겨찾기가 없습니다</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* My Page */}
        {currentPage === 'mypage' && (
          <MyPage
            userEmail={userEmail}
            favoriteCount={myFavorites.length}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}

      {/* Anime Detail Modal */}
      {selectedAnimeId && (
        <AnimeDetailModal
          animeId={selectedAnimeId}
          onClose={handleCloseDetail}
          onAddFavorite={handleAddFavorite}
          isFavorite={isFavorite(selectedAnimeId)}
        />
      )}
    </div>
  );
}

export default App;