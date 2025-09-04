import Head from 'next/head';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import Link from 'next/link';

import AppContext from '../../context/app-context';
import buildClient from '../../api/base-client';

interface ProfileProps {
  profile?: any;
  userListings?: any[];
  error?: string;
}

const Profile = ({ profile, userListings = [], error }: ProfileProps) => {
  const router = useRouter();
  const { username } = router.query;
  const { auth } = useContext(AppContext);

  if (error) {
    return (
      <>
        <Head>
          <title>Profile Not Found | AuctionHub</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
                <p className="text-gray-600 mb-6">The user profile you're looking for doesn't exist.</p>
                <Link href="/">
                  <a className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium">
                    Return Home
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isOwnProfile = auth.isAuthenticated && auth.currentUser?.name === username;

  return (
    <>
      <Head>
        <title>{username ? `${username}'s Profile` : 'Profile'} | AuctionHub</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-8">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.imageUrl ? (
                    <img
                      src={profile.imageUrl}
                      alt={`${username}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {username?.toString().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
                  <p className="text-gray-600 mt-1">
                    {profile?.about || 'Auction enthusiast and collector'}
                  </p>
                  {profile?.country && (
                    <p className="text-gray-500 text-sm mt-2">📍 {profile.country}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="flex space-x-3">
                    <Link href="/settings/profile">
                      <a className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium">
                        Edit Profile
                      </a>
                    </Link>
                    <Link href="/dashboard">
                      <a className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium">
                        Dashboard
                      </a>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{userListings.length}</div>
                <div className="text-gray-600">Active Listings</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-gray-600">Successful Sales</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">⭐⭐⭐⭐⭐</div>
                <div className="text-gray-600">Seller Rating</div>
              </div>
            </div>
          </div>

          {/* User's Listings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isOwnProfile ? 'Your Active Listings' : `${username}'s Active Listings`}
              </h2>
            </div>
            
            {userListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {userListings.map((listing) => (
                  <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="text-center mb-3">
                      <div className="text-4xl mb-2">
                        {getEmojiForListing(listing.title)}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">{listing.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600 font-medium">
                        ${(listing.price / 100).toFixed(2)}
                      </span>
                      <Link href={`/listings/${listing.slug}`}>
                        <a className="text-yellow-600 hover:text-yellow-700 font-medium">
                          View →
                        </a>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Listings</h3>
                <p className="text-gray-600 mb-6">
                  {isOwnProfile 
                    ? "You haven't created any listings yet. Start selling today!" 
                    : `${username} doesn't have any active listings at the moment.`
                  }
                </p>
                {isOwnProfile && (
                  <Link href="/sell">
                    <a className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium">
                      Create Your First Listing
                    </a>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function to get emoji for listing
function getEmojiForListing(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('watch') || titleLower.includes('rolex') || titleLower.includes('omega')) return '⌚';
  if (titleLower.includes('car') || titleLower.includes('auto') || titleLower.includes('vehicle')) return '🚗';
  if (titleLower.includes('art') || titleLower.includes('paint') || titleLower.includes('canvas')) return '🎨';
  if (titleLower.includes('book') || titleLower.includes('novel') || titleLower.includes('manuscript')) return '';
  if (titleLower.includes('coin') || titleLower.includes('currency') || titleLower.includes('money')) return '🪙';
  if (titleLower.includes('wine') || titleLower.includes('champagne') || titleLower.includes('bottle')) return '🍷';
  if (titleLower.includes('guitar') || titleLower.includes('piano') || titleLower.includes('music')) return '🎸';
  if (titleLower.includes('ring') || titleLower.includes('necklace') || titleLower.includes('jewelry')) return '💍';
  if (titleLower.includes('camera') || titleLower.includes('photo') || titleLower.includes('lens')) return '📷';
  if (titleLower.includes('antique') || titleLower.includes('vintage') || titleLower.includes('old')) return '🏺';
  if (titleLower.includes('stamp') || titleLower.includes('post') || titleLower.includes('mail')) return '📮';
  if (titleLower.includes('diamond') || titleLower.includes('gem') || titleLower.includes('crystal')) return '💎';
  
  return ''; // Default fallback
}

Profile.getInitialProps = async (context: NextPageContext, client: any) => {
  try {
    const { username } = context.query;
    
    // For now, we'll just return mock data since we don't have user profile endpoints
    // In a real implementation, you'd fetch user profile and their listings
    
    return { 
      profile: { 
        about: 'Passionate collector and auction enthusiast',
        country: 'United States'
      },
      userListings: [] // This would be fetched from `/api/listings/user/${username}` 
    };
  } catch (err) {
    console.error('Profile fetch error:', err);
    return { 
      error: 'Profile not found',
      profile: null,
      userListings: []
    };
  }
};

export default Profile;
