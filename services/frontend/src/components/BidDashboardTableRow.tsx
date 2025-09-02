import { ListingStatus } from '@jjmauction/common';
import Link from 'next/link';
import React, { useContext } from 'react';
import StripeCheckout from 'react-stripe-checkout';
import { toast } from 'react-toastify';

import AppContext from '../context/app-context';
import { centsToDollars } from '../utils/cents-to-dollars';
import Countdown from './Countdown';
import buildClient from '../api/base-client';

const BidDashboardTableRow = ({ bid, onDelete }) => {
  const { auth } = useContext(AppContext);

  const createPayment = async ({ id }) => {
    try {
      const client = buildClient({});
      await client.post('/api/payments', {
        listingId: bid.listing.id,
        token: id,
      });
      toast.success('Payment completed successfully!');
      window.location.reload(); // Refresh page to show updated status
    } catch (err) {
      console.error('Payment error:', err);
      
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          toast.error(error.message || 'Payment failed. Please try again.');
        });
      } else if (err.response?.status === 400) {
        toast.error('Payment failed. The listing may no longer be available for payment.');
      } else if (err.response?.status === 401) {
        toast.error('You must be logged in to make a payment.');
      } else if (err.response?.status === 404) {
        toast.error('Listing not found. It may have been removed.');
      } else {
        toast.error('Payment failed. Please check your payment details and try again.');
      }
    }
  };

  const requiresPayment = () => {
    console.log('Debug requiresPayment:', {
      status: bid.listing.status,
      currentWinnerId: bid.listing.currentWinnerId,
      currentUserId: auth.currentUser?.id,
      listingData: bid.listing
    });
    
    return (
      bid.listing.status === ListingStatus.AwaitingPayment &&
      bid.listing.currentWinnerId === auth.currentUser?.id
    );
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <img
              className="h-10 w-10 rounded-full"
              src={bid.user.avatar}
              alt="Your Avatar"
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {bid.user.name}
            </div>
            <div className="text-sm text-gray-500">{bid.user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Link href={`/listings/${bid.listing.slug}`}>
          <a className="hover:underline text-sm text-gray-900">
            {bid.listing.title}
          </a>
        </Link>
        <div className="text-sm text-gray-500">
          <Countdown 
            expiresAt={bid.listing.expiresAt}
            showExpiredMessage={true}
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {centsToDollars(bid.amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {centsToDollars(bid.listing.currentPrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {bid.listing.status === ListingStatus.Active ? (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        ) : bid.listing.status === ListingStatus.Expired ? (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Expired
          </span>
        ) : bid.listing.status === ListingStatus.AwaitingPayment ? (
          <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Payment Due
          </span>
        ) : bid.listing.status === ListingStatus.Complete ? (
          <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Complete
          </span>
        ) : (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {bid.listing.status}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {requiresPayment() ? (
          <div className="inline-block">
            <StripeCheckout
              token={createPayment}
              stripeKey="pk_test_51I7NJ5LQOU4SKz9IV9bdjUwPlGAb9UDKlwjKLxdmu52uQpPHfKn6KvpBIpEIIbI1XISEaFRmIpHgnpIGVFlwmKu300buDGjcwL"
              amount={bid.listing.currentPrice}
              name="Auction Payment"
              description={`Payment for ${bid.listing.title}`}
              email={auth.currentUser?.email}
              panelLabel="Pay Now"
              allowRememberMe={false}
              bitcoin={false}
              zipCode={false}
              billingAddress={false}
              shippingAddress={false}
            >
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 transform hover:scale-105">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay {centsToDollars(bid.listing.currentPrice)}
              </button>
            </StripeCheckout>
          </div>
        ) : bid.listing.status === ListingStatus.Active ? (
          <button
            onClick={onDelete}
            className="text-amber-600 hover:text-amber-900 font-medium transition-colors"
          >
            Delete
          </button>
        ) : (
          <span className="text-gray-400 text-sm">
            {bid.listing.status === ListingStatus.Expired ? 'Auction Ended' : 
             bid.listing.status === ListingStatus.Complete ? 'Completed' : 'Cannot Delete'}
          </span>
        )}
      </td>
    </tr>
  );
};

export default BidDashboardTableRow;
