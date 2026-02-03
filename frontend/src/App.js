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

  // 중복 제거 헬퍼 함수
  const removeDuplicateAnimes = (animes) => {
    if (!Array.isArray(animes)) return [];
    
    const uniqueMap = new Map();
    animes.forEach(anime => {
      const id = anime.anime_id || anime.mal_id;
      if (id && !uniqueMap.has(id)) {
        uniqueMap.set(id, anime);
      }
    });
    return Array.from(uniqueMap.values());
  };

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
      console.error('사용자 정보 로드 실패', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const loadPopularAnimes = async () => {
    try {
      const response = await animeApi.getPopularAnimes();
      const uniqueAnimes = removeDuplicateAnimes(response.data);
      setPopularAnimes(uniqueAnimes);
      console.log('🎬 인기 애니 로드:', uniqueAnimes.length, '개');
    } catch (error) {
      console.error('인기 애니 로드 실패', error);
    }
  };

  const loadMyData = async () => {
    try {
      const favs = await animeApi.getFavorites();
      const uniqueFavs = removeDuplicateAnimes(favs.data);
      setMyFavorites(uniqueFavs);
      console.log('📋 즐겨찾기 목록 로드:', uniqueFavs.length, '개');
      
      // 즐겨찾기가 있을 때만 추천 가져오기
      if (uniqueFavs.length > 0) {
        try {
          const recs = await animeApi.getPersonalRecommendations();
          const uniqueRecs = removeDuplicateAnimes(recs.data.recommendations || []);
          setRecommendations(uniqueRecs);
          console.log('💡 추천 목록 로드:', uniqueRecs.length, '개');
        } catch (recError) {
          // 404는 정상 (즐겨찾기가 없으면 추천도 없음)
          if (recError.response?.status !== 404) {
            console.error('추천 로드 실패', recError);
          }
          setRecommendations([]);
        }
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      // 404는 무시 (즐겨찾기 없음)
      if (error.response?.status === 404) {
        setMyFavorites([]);
        setRecommendations([]);
        return;
      }
      
      console.error('데이터 로드 실패', error);
      
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    setLoading(true);
    try {
      const response = await animeApi.searchAnime(keyword);
      const uniqueResults = removeDuplicateAnimes(response.data);
      setSearchResults(uniqueResults);
      setCurrentPage('search');
      console.log('🔍 검색 결과:', uniqueResults.length, '개');
    } catch (error) {
      console.error('검색 실패', error);
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    try {
      await animeApi.login(email, password);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      await loadUserInfo();
      await loadMyData();
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

    const animeId = anime.anime_id || anime.mal_id;
    
    console.log('➕ 즐겨찾기 추가 시도:', {
      anime_id: animeId,
      title: anime.title,
      image_url: anime.image_url || anime.images?.jpg?.image_url,
      원본객체: anime
    });

    try {
      await animeApi.addFavorite(
        animeId,
        anime.title,
        anime.image_url || anime.images?.jpg?.image_url
      );
      await loadMyData();
      console.log('✅ 즐겨찾기 추가 성공');
    } catch (error) {
      console.error('❌ 즐겨찾기 추가 실패', error);
      console.error('에러 상세:', error.response?.data);
      
      if (error.response?.status === 401) {
        handleLogout();
        setShowLoginModal(true);
      } else {
        alert(`추가 실패: ${error.response?.data?.detail || '알 수 없는 오류'}`);
      }
    }
  };

  const handleRemoveFavorite = async (animeId) => {
    console.log('🗑️ 즐겨찾기 삭제 시도 anime_id:', animeId);
    console.log('📋 현재 즐겨찾기 목록:', myFavorites);
    
    // 즐겨찾기 목록에서 해당 anime_id 찾기
    const targetFavorite = myFavorites.find(fav => fav.anime_id === animeId);
    console.log('🎯 삭제 대상:', targetFavorite);
    
    try {
      await animeApi.removeFavorite(animeId);
      await loadMyData();
      console.log('✅ 즐겨찾기 삭제 성공');
    } catch (error) {
      console.error('❌ 즐겨찾기 삭제 실패', error);
      console.error('에러 상세:', error.response?.data);
      alert(`삭제 실패: ${error.response?.data?.detail || '알 수 없는 오류'}`);
    }
  };

  const handleGetRecommendations = async (title) => {
    setLoading(true);
    try {
      const response = await animeApi.getRecommendations(title);
      const uniqueRecs = removeDuplicateAnimes(response.data.recommendations || []);
      setRecommendations(uniqueRecs);
      setCurrentPage('recommendations');
      console.log('🎯 타이틀 기반 추천:', uniqueRecs.length, '개');
    } catch (error) {
      console.error('추천 받기 실패', error);
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
                {popularAnimes.map((anime, index) => (
                  <div key={`popular-${anime.anime_id}-${index}`}>
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
                  {myFavorites.map((favorite, index) => (
                    <div key={`favorite-${favorite.anime_id}-${index}`}>
                      {/* AnimeCard 사용 */}
                    </div>
                  ))}
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