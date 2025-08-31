import styled from '@emotion/styled';
import Head from 'next/head';
import React, { useState } from 'react';
import tw from 'twin.macro';

import Breadcrumb from '../../components/Breadcrumb';
import Breadcrumbs from '../../components/Breadcrumbs';
import ListingCard from '../../components/ListingCard';

const StyledListings = styled.div`${tw`
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4
  2xl:grid-cols-5
  gap-6
  py-8
  auto-rows-fr
`}`;

const Listings = ({ listings, search }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('ending-soon');
  const [filterBy, setFilterBy] = useState('all');

  const categories = [
    'All Categories',
    'Art & Antiques',
    'Collectibles',
    'Electronics',
    'Jewelry & Watches',
    'Vintage Items',
    'Sports Memorabilia'
  ];

  const sortOptions = [
    { value: 'ending-soon', label: 'Ending Soon' },
    { value: 'newest', label: 'Newly Listed' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'most-bids', label: 'Most Bids' }
  ];

  return (
    <>
      <Head>
        <title>Premium Auctions | AuctionHub - Discover Rare Items</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="description" content="Browse premium auctions and bid on rare collectibles, vintage items, and unique treasures at AuctionHub." />
      </Head>
      
      <Breadcrumbs>
        <Breadcrumb link="/" name="Home" />
        <Breadcrumb link="/listings" name="Auctions" />
      </Breadcrumbs>

      {/* Header Section */}
      <div className="bg-yellow-50 rounded-2xl p-6 mb-8 border border-yellow-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {!search ? (
                <>
                  <span className="text-yellow-600">
                    Live Auctions
                  </span>
                  <span className="text-gray-700"> & Bidding</span>
                </>
              ) : (
                <>
                  Search Results for{' '}
                  <span className="text-yellow-600">
                    "{search}"
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg text-gray-600">
              {listings.length > 0 ? (
                <>
                  <span className="font-semibold text-yellow-700">{listings.length}</span>
                  {' '}exclusive items waiting for your bid
                </>
              ) : (
                'No auctions found matching your criteria'
              )}
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex space-x-6 text-center">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">{listings.length}</div>
              <div className="text-sm text-gray-500">Active Auctions</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-yellow-100">
              <div className="text-2xl font-bold text-green-600">Live</div>
              <div className="text-sm text-gray-500">Bidding Now</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        {/* Categories Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 4).map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filterBy === category.toLowerCase().replace(' ', '-')
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
              onClick={() => setFilterBy(category.toLowerCase().replace(' ', '-'))}
            >
              {category}
            </button>
          ))}
        </div>

        {/* View and Sort Controls */}
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            <button
              className={`p-2 rounded-l-lg ${
                viewMode === 'grid' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setViewMode('grid')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              className={`p-2 rounded-r-lg ${
                viewMode === 'list' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setViewMode('list')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {listings.length > 0 ? (
        <StyledListings>
          {listings.map((listing, idx) => (
            <ListingCard
              key={idx}
              name={listing.title}
              expiresAt={listing.expiresAt}
              price={listing.currentPrice}
              smallImage={listing.smallImage}
              slug={`/listings/${listing.slug}`}
            />
          ))}
        </StyledListings>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No auctions found</h3>
          <p className="text-gray-500 mb-6">
            {search 
              ? `No results found for "${search}". Try adjusting your search terms.`
              : "There are currently no active auctions. Check back soon for new listings!"
            }
          </p>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Browse All Categories
          </button>
        </div>
      )}
    </>
  );
};

Listings.getInitialProps = async ({ query }, client) => {
  const { data } = await client.get(
    `/api/listings?search=${query.search || ''}`
  );

  return { listings: data || [], search: query.search };
};

export default Listings;
