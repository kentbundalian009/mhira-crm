import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Sparkles,
  Star,
  ShieldCheck,
  Search,
  Users,
  ShoppingBag,
  SlidersHorizontal,
  ChevronDown,
  X,
  Loader2,
  TrendingUp,
  Flame,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import axios from '../../axios';
import HeaderContainer from '../common/HeaderContainer';
import Footer from '../common/Footer';
import { useAppData } from '../../context/AppDataContext';
import { getUserId } from '../../utils/userId';
import { GoldMedal, SilverMedal, BronzeMedal } from '../common/MedalIcons';
import { useLiveSync } from '../../utils/liveSync';

// Helper for 2-letter uppercase initials on cards & avatars (like SI, TD, LO in leaderboard)
const getInitials = (name = '') => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

function CustomerMhiraShoppers() {
  const { user: contextUser } = useAppData();
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState('rank-asc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortDropdownRef = useRef(null);
  const userId = getUserId();
  const activeUser = currentUserProfile || contextUser;

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  // Fetch Shoppers function (silent option for real-time updates)
  const fetchLeaderboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/logistics/sales-report/leaderboard`);
      if (res.data?.leaderboard) {
        setLeaderboard(Array.isArray(res.data.leaderboard) ? res.data.leaderboard : []);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.warn('Error fetching customer shoppers list:', err);
      setLeaderboard([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // Real-time synchronization: refresh silently when orders, logistics, or users change
  useLiveSync(['logistics', 'orders', 'users'], () => {
    fetchLeaderboard(true);
  });

  // Fetch logged-in user profile to show their VIP card
  useEffect(() => {
    if (userId) {
      axios.get(`${API_BASE_URL}/api/users/profile/${userId}`)
        .then((res) => {
          if (res.data) setCurrentUserProfile(res.data);
        })
        .catch(() => { });
    }
  }, [userId, API_BASE_URL]);

  // Click outside listener for sort dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered and Sorted Shoppers
  const filteredAndSortedLeaderboard = useMemo(() => {
    let list = Array.isArray(leaderboard) ? [...leaderboard] : [];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const unameMatch = (item.username || '').toLowerCase().includes(q);
        return nameMatch || unameMatch;
      });
    }

    // Filter by Tier
    if (selectedTier !== 'All') {
      const sel = selectedTier.toLowerCase();
      list = list.filter((item) => {
        const itemTier = (item.tier || '').toLowerCase();
        if (sel === 'gold' || sel === 'loyal') {
          return itemTier.includes('gold') || itemTier.includes('loyal') || itemTier.includes('platinum');
        }
        return itemTier.includes(sel);
      });
    }

    // Sort
    if (sortBy === 'points-desc') {
      return list.sort((a, b) => Number(b.rewardPoints || 0) - Number(a.rewardPoints || 0));
    }
    if (sortBy === 'orders-desc') {
      return list.sort((a, b) => Number(b.orderCount || 0) - Number(a.orderCount || 0));
    }
    if (sortBy === 'name-asc') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    // Default: rank-asc
    return list.sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
  }, [leaderboard, searchQuery, selectedTier, sortBy]);

  const renderBadge = (tier, isDark = false) => {
    const t = (tier || '').toLowerCase();
    if (t.includes('gold') || t.includes('loyal') || t.includes('platinum')) {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-2xs whitespace-nowrap ${
            isDark
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              : 'bg-amber-50 text-amber-800 border border-amber-300'
          }`}
        >
          Gold Tier
        </span>
      );
    }
    if (t.includes('silver')) {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-2xs whitespace-nowrap ${
            isDark
              ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
              : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}
        >
          Silver Tier
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-2xs whitespace-nowrap ${
          isDark
            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
            : 'bg-orange-50 text-orange-800 border border-orange-200'
        }`}
      >
        Bronze Tier
      </span>
    );
  };

  const userTier =
    activeUser?.tier && !activeUser.tier.toLowerCase().includes('platinum')
      ? activeUser.tier
      : Number(activeUser?.totalSpent || 0) >= 5000 || Number(activeUser?.orderCount || 0) >= 3
        ? 'Gold'
        : Number(activeUser?.totalSpent || 0) >= 1000 || Number(activeUser?.orderCount || 0) >= 1
          ? 'Silver'
          : 'Bronze';

  const userPoints = Number(activeUser?.rewardPoints || 0);

  const tierTabs = [
    { id: 'All', label: 'All Shoppers' },
    { id: 'Gold', label: 'Gold Tier' },
    { id: 'Silver', label: 'Silver Tier' },
    { id: 'Bronze', label: 'Bronze Tier' },
  ];

  const sortOptions = [
    { label: 'Rank: Top First', value: 'rank-asc' },
    { label: 'Points: High-Low', value: 'points-desc' },
    { label: 'Orders: High-Low', value: 'orders-desc' },
    { label: 'Name: A-Z', value: 'name-asc' },
  ];

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ================= BREADCRUMB & PAGE TITLE ================= */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline hover:text-[#01390f] transition-colors">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 capitalize">
              {selectedTier && selectedTier !== 'All' ? `${selectedTier} Tier` : 'Mhira Shoppers'}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight capitalize flex items-center gap-2.5">
                <span>Mhira Shoppers</span>
                {filteredAndSortedLeaderboard.length > 0 && (
                  <span className="text-xs font-semibold text-[#01390f] bg-[#EDF7EE] px-2.5 py-0.5 rounded-full border border-[#D5EAD7]">
                    {filteredAndSortedLeaderboard.length} Ranked
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Honoring our top community customers, reward points, and verified purchase rankings.
              </p>
            </div>

            {/* CONTROLS (HIDE FILTERS + SORT BY) */}
            <div className="flex items-center gap-6 sm:gap-8 self-start sm:self-auto">
              {/* HIDE FILTERS BUTTON */}
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                title={showFilters ? 'Hide Filters' : 'Show Filters'}
              >
                <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                <SlidersHorizontal
                  size={16}
                  className={`transition-transform duration-300 ease-out group-hover:scale-110 ${!showFilters ? 'rotate-90 text-[#01390f]' : 'text-slate-700 group-hover:text-[#01390f]'
                    }`}
                />
              </button>

              {/* SORT BY DROPDOWN */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                >
                  <span>
                    Sort By:{' '}
                    <span className="text-slate-500 font-normal group-hover:text-[#01390f] transition-colors">
                      {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Rank: Top First'}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180 text-[#01390f]' : 'text-slate-700 group-hover:text-[#01390f]'
                      }`}
                  />
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 top-full pt-2 w-48 sm:w-52 z-50 animate-fadeIn">
                    <div className="bg-[#f7faf8] border border-[#D5EAD7] shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 text-[#2D3732] py-1.5">
                      {sortOptions.map((opt) => {
                        const isSelected = sortBy === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.value);
                              setIsSortOpen(false);
                            }}
                            className={`w-full px-5 py-2.5 text-xs sm:text-sm text-right transition-colors cursor-pointer block font-semibold ${isSelected
                              ? 'bg-[#EDF7EE] text-[#01390f] font-bold'
                              : 'text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]'
                              }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN TWO-COLUMN BODY LAYOUT ================= */}
        <div className="flex flex-col md:flex-row items-start transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
          {/* ================= LEFT SIDEBAR (TIERS / CATEGORIES) ================= */}
          <aside
            aria-hidden={!showFilters}
            className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden flex-shrink-0 ${showFilters
              ? 'max-h-[600px] w-full md:w-56 opacity-100 translate-x-0 mb-6 md:mb-0 md:mr-8 lg:mr-12 pointer-events-auto'
              : 'max-h-0 md:max-h-[600px] w-full md:w-0 opacity-0 -translate-x-6 md:-translate-x-8 mb-0 md:mb-0 md:mr-0 pointer-events-none'
              }`}
          >
            <div className="w-full md:w-56">
              <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
                {tierTabs.map((tab) => {
                  const isActive = selectedTier === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTier(tab.id)}
                      className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${isActive
                        ? 'text-[#01390f] font-bold'
                        : 'text-[#26332E] hover:text-[#01390f] font-normal'
                        }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex-1 w-full min-w-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] space-y-8">
            {/* Search Filter tag indicator */}
            {searchQuery && (
              <div className="flex items-center gap-2 text-xs text-[#243746]">
                <span>Filtered by search: <strong className="text-[#243746]">"{searchQuery}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#01390f] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> Clear search
                </button>
              </div>
            )}

            {/* Clean Minimalist Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shopper by name or @username..."
                className="w-full bg-[#FAFBF9] border border-[#D5EAD7] rounded-full pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ================= UNIFIED MHIRA SHOPPERS HALL OF FAME & LEADERBOARD CONTAINER ================= */}
            <div className="bg-white border border-[#D5EAD7] rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-8">
              {/* Header Section inside Container */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EDF7EE] border border-[#D5EAD7] flex items-center justify-center text-[#01390f]">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Mhira Shoppers Hall of Fame
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-normal mt-1">
                    Recognizing our top community champions by verified completed purchases and loyalty points.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-[#01390f] font-semibold bg-[#EDF7EE] px-3 py-1 rounded-full border border-[#D5EAD7]">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Real-Time Sync</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                    {filteredAndSortedLeaderboard.length} Ranked {filteredAndSortedLeaderboard.length === 1 ? 'Member' : 'Members'}
                  </div>
                </div>
              </div>

              {/* ================= FULL LEADERBOARD TABLE (SHOPPERS HALL OF FAME) ================= */}
              <div className="overflow-x-auto border border-[#D5EAD7] rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-4 text-center w-20">Rank</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Shopper</th>
                      <th className="py-3.5 px-4 text-center">Loyalty Tier</th>
                      <th className="py-3.5 px-4 text-center">Reward Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-normal bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-12 text-[#01390f]">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                            <span className="font-medium text-sm text-slate-700">Loading Mhira Shoppers rankings...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAndSortedLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-slate-400 italic">
                          No shoppers match your search or tier filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedLeaderboard.map((c) => {
                        const isCurrentActiveUser =
                          activeUser &&
                          (c.username === activeUser.username ||
                            (activeUser._id && c.id === activeUser._id) ||
                            (c.name && activeUser.fullName && c.name.toLowerCase() === activeUser.fullName.toLowerCase()));

                        // Dynamic background styling based on rank (1 = Gold, 2 = Silver, 3 = Bronze)
                        let rowBgClasses = 'hover:bg-[#EDF7EE]/50 border-l-4 border-l-transparent';
                        if (c.rank === 1) {
                          rowBgClasses = 'bg-gradient-to-r from-amber-100/90 via-amber-50/70 to-white hover:from-amber-200/80 hover:to-amber-100/60 border-l-4 border-l-amber-500 font-medium';
                        } else if (c.rank === 2) {
                          rowBgClasses = 'bg-gradient-to-r from-slate-200/80 via-slate-100/60 to-white hover:from-slate-200 hover:to-slate-100 border-l-4 border-l-slate-400 font-medium';
                        } else if (c.rank === 3) {
                          rowBgClasses = 'bg-gradient-to-r from-amber-100/70 via-orange-50/60 to-white hover:from-orange-100 hover:to-orange-50 border-l-4 border-l-amber-700/60 font-medium';
                        } else if (isCurrentActiveUser) {
                          rowBgClasses = 'bg-emerald-50/80 hover:bg-emerald-100/60 border-l-4 border-l-[#01390f] font-medium';
                        }

                        return (
                          <tr
                            key={c.username || c.name}
                            className={`transition-colors ${rowBgClasses}`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              {c.rank === 1 ? (
                                <div className="inline-flex items-center gap-1.5 justify-center px-2 py-0.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 font-bold text-xs" title="1st Place - Gold Champion">
                                  <GoldMedal className="w-5 h-5 drop-shadow-2xs" size={20} />
                                  <span>#1</span>
                                </div>
                              ) : c.rank === 2 ? (
                                <div className="inline-flex items-center gap-1.5 justify-center px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs" title="2nd Place - Silver">
                                  <SilverMedal className="w-5 h-5 drop-shadow-2xs" size={20} />
                                  <span>#2</span>
                                </div>
                              ) : c.rank === 3 ? (
                                <div className="inline-flex items-center gap-1.5 justify-center px-2 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-orange-900 font-bold text-xs" title="3rd Place - Bronze">
                                  <BronzeMedal className="w-5 h-5 drop-shadow-2xs" size={20} />
                                  <span>#3</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                                  #{c.rank}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 overflow-hidden ${
                                    c.rank === 1
                                      ? 'bg-amber-100 border-2 border-amber-400 text-amber-900 ring-2 ring-amber-300/40'
                                      : c.rank === 2
                                      ? 'bg-slate-100 border-2 border-slate-300 text-slate-700 ring-2 ring-slate-200/40'
                                      : c.rank === 3
                                      ? 'bg-orange-100 border-2 border-amber-600/70 text-amber-900 ring-2 ring-orange-200/40'
                                      : 'bg-[#FAFBF9] border border-[#D5EAD7] text-[#01390f]'
                                  }`}
                                >
                                  {c.profileImage ? (
                                    <img
                                      src={c.profileImage}
                                      alt=""
                                      className="w-full h-full object-cover rounded-full"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    getInitials(c.name)
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 block text-xs sm:text-sm">{c.name}</span>
                                    {isCurrentActiveUser && (
                                      <span className="bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] text-[#01390f] font-medium block">
                                    @{c.username} · {c.orderCount || 1} {c.orderCount === 1 ? 'order' : 'orders'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {renderBadge(c.tier, false)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="inline-block font-mono font-black text-xs text-amber-600 drop-shadow-2xs bg-amber-50/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                                {Number(c.rewardPoints != null ? c.rewardPoints : (Number(c.orderCount || 1) * 25)).toLocaleString()} pts
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ================= REWARDS PROGRAM BENEFITS GUIDE ================= */}
            <div className="space-y-4 pt-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-lg sm:text-xl font-normal text-slate-900 tracking-tight">
                  Mhira Rewards Program
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Accumulate points every time you shop and redeem them directly for discounts on checkout.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-[#D5EAD7] p-5 rounded-2xl space-y-2.5 shadow-2xs hover:border-[#01390f]/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                    <Star className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-slate-900 text-sm">Bronze Tier</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Default tier for new shoppers (0 orders). Earn 1 point per ₱50 spent on all natural skincare and beauty products.
                  </p>
                </div>

                <div className="bg-white border border-[#D5EAD7] p-5 rounded-2xl space-y-2.5 shadow-2xs hover:border-[#01390f]/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-slate-900 text-sm">Silver Tier (1+ Orders / ₱1k+)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Unlocked automatically after placing your first order. Silver badge shown on reviews and early access to promotions.
                  </p>
                </div>

                <div className="bg-white border border-[#D5EAD7] p-5 rounded-2xl space-y-2.5 shadow-2xs hover:border-[#01390f]/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-slate-900 text-sm">Gold Tier (3+ Orders / ₱5k+)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    The highest tier of Mhira loyalty. Gold badge on community reviews, priority packing, and exclusive member discounts.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Exact Store Style */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/collection"
                  className="py-2.5 sm:py-3 px-6 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer text-center inline-flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explore Collection & Earn Points</span>
                </Link>
                <Link
                  to="/account?tab=vip"
                  className="py-2.5 sm:py-3 px-6 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] inline-flex items-center gap-1.5"
                >
                  <span>View My Reward Points</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerMhiraShoppers;
