'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LeaderboardApi, type LeaderboardEntry } from '@/lib/api';
import { TrophyIcon, FireIcon, HeartIcon, UserIcon } from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'reports' | 'upvotes' | 'points'>('points');
  const [limit, setLimit] = useState(20);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await LeaderboardApi.getLeaderboard(limit, sortBy);
      setLeaderboard(data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
      console.error('Failed to fetch leaderboard:', error);
      // Mock data for development
      const mockData: LeaderboardEntry[] = [
        {
          id: '1',
          name: 'सुनीता देवी',
          totalReports: 15,
          totalUpvotes: 289,
          points: 445,
          badges: ['🥇', '🦸', '🏛️', '⚡', '🌟'],
          rank: 1
        },
        {
          id: '2',
          name: 'अनिल प्रसाद',
          totalReports: 12,
          totalUpvotes: 234,
          points: 378,
          badges: ['🥇', '🦸', '🏛️', '⚡'],
          rank: 2
        },
        {
          id: '3',
          name: 'राज कुमार',
          totalReports: 8,
          totalUpvotes: 156,
          points: 324,
          badges: ['🥇', '🦸', '🏛️', '⚡'],
          rank: 3
        },
        {
          id: '4',
          name: 'प्रीति मिश्रा',
          totalReports: 6,
          totalUpvotes: 142,
          points: 298,
          badges: ['🥇', '🦸', '🏛️'],
          rank: 4
        },
        {
          id: '5',
          name: 'राम कृष्ण मुंडा',
          totalReports: 5,
          totalUpvotes: 98,
          points: 203,
          badges: ['🥇', '🦸'],
          rank: 5
        },
        {
          id: '6',
          name: 'कमला शर्मा',
          totalReports: 4,
          totalUpvotes: 76,
          points: 154,
          badges: ['🥇'],
          rank: 6
        },
        {
          id: '7',
          name: 'विकास सिंह',
          totalReports: 3,
          totalUpvotes: 45,
          points: 93,
          badges: ['🥇'],
          rank: 7
        }
      ];
      setLeaderboard(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <TrophySolid className="w-8 h-8 text-yellow-500" />;
      case 2: return <TrophySolid className="w-7 h-7 text-gray-400" />;
      case 3: return <TrophySolid className="w-6 h-6 text-orange-600" />;
      default: return <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const totalStats = leaderboard.reduce((acc, user) => ({
    totalReports: acc.totalReports + user.totalReports,
    totalUpvotes: acc.totalUpvotes + user.totalUpvotes,
    totalPoints: acc.totalPoints + user.points,
  }), { totalReports: 0, totalUpvotes: 0, totalPoints: 0 });

  return (
    <div className="p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Community Leaderboard</h1>
        <p className="text-gray-600">Top citizens making a difference in Jharkhand</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <UserIcon className="w-6 h-6 text-blue-600 mr-2" />
            <span className="text-2xl font-bold text-blue-600">{totalStats.totalReports}</span>
          </div>
          <p className="text-sm text-blue-700">Total Reports Submitted</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <HeartIcon className="w-6 h-6 text-red-600 mr-2" />
            <span className="text-2xl font-bold text-red-600">{totalStats.totalUpvotes}</span>
          </div>
          <p className="text-sm text-red-700">Total Upvotes Received</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <FireIcon className="w-6 h-6 text-green-600 mr-2" />
            <span className="text-2xl font-bold text-green-600">{totalStats.totalPoints}</span>
          </div>
          <p className="text-sm text-green-700">Total Points Earned</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="points">🔥 By Points</option>
              <option value="reports">📝 By Reports</option>
              <option value="upvotes">❤️ By Upvotes</option>
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            🏅 Community Champions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing top {leaderboard.length} citizens sorted by {sortBy}
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {leaderboard.map((user) => (
            <div
              key={user.id}
              className={`p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${getRankColor(user.rank)} border-l-4`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getRankIcon(user.rank)}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {user.name}
                    {user.rank <= 3 && <span className="ml-2 text-sm">👑</span>}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {user.totalReports} reports
                    </span>
                    <span className="flex items-center">
                      <HeartIcon className="w-4 h-4 mr-1" />
                      {user.totalUpvotes} upvotes
                    </span>
                    <span className="flex items-center">
                      <FireIcon className="w-4 h-4 mr-1" />
                      {user.points} points
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {user.badges.map((badge, index) => (
                      <span key={index} className="text-lg">{badge}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  sortBy === 'points' ? 'text-green-600' :
                  sortBy === 'reports' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {sortBy === 'points' ? user.points :
                   sortBy === 'reports' ? user.totalReports : user.totalUpvotes}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Rank #{user.rank}
                </div>
              </div>
            </div>
          ))}
        </div>

        {leaderboard.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No leaderboard data available</p>
            <p className="text-sm">Check back once citizens start reporting issues!</p>
          </div>
        )}
      </div>
    </div>
  );
}
