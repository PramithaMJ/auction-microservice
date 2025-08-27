import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

const Home = () => {
  return (
    <>
      <Head>
        <title>AuctionHub - Premium Online Auctions</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="description" content="Discover rare items, bid on exclusive auctions, and find treasures at AuctionHub - Your premier destination for online auctions." />
      </Head>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Discover</span>
              <span className="block text-yellow-600">
                Extraordinary Auctions
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Join thousands of collectors and enthusiasts in our premium auction platform. 
              Bid on rare items, vintage collectibles, and unique treasures from around the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/listings">
                <a className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explore Auctions
                </a>
              </Link>
              <Link href="/sell">
                <a className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-lg font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start Selling
                </a>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose AuctionHub?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the thrill of bidding with our cutting-edge platform built for modern auctioneers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 rounded-2xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Lightning Fast Bidding</h3>
              <p className="text-gray-600">Real-time bidding system ensures you never miss an opportunity with instant notifications and seamless updates.</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-2xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Trusted</h3>
              <p className="text-gray-600">Advanced security measures and verified sellers ensure safe transactions and authentic items every time.</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Rare Collections</h3>
              <p className="text-gray-600">Discover unique items from vintage collectibles to modern art, curated by experts and passionate collectors.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-yellow-500 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Start Your Auction Journey?
          </h2>
          <p className="text-xl text-yellow-100 mb-8">
            Join our community of collectors and discover your next treasure today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <a className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-xl text-yellow-600 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                Get Started Free
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Technical Info */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 mb-4">
            <strong>Demo Platform:</strong> This is a showcase application demonstrating modern microservices architecture
          </p>
          <p className="text-xs text-gray-400">
            Built with TypeScript, Node.js, React, Next.js, MySQL, Docker, and Kubernetes
          </p>
        </div>
      </section>
    </>
  );
};

export default Home;
