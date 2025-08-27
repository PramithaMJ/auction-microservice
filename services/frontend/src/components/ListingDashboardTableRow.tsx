import Link from 'next/link';
import { ListingStatus } from '@jjmauction/common';

import { centsToDollars } from '../utils/cents-to-dollars';
import Countdown from './Countdown';

const ListingDashboardTableRow = ({ listing, onDelete }) => {
  // Helper function to check if auction is expired
  const isExpired = () => {
    if (listing.status !== ListingStatus.Active) {
      return listing.status === ListingStatus.Expired;
    }
    return new Date() > new Date(listing.expiresAt);
  };

  // Helper function to get status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case ListingStatus.Active:
        return 'bg-green-100 text-green-800';
      case ListingStatus.Expired:
        return 'bg-red-100 text-red-800';
      case ListingStatus.AwaitingPayment:
        return 'bg-yellow-100 text-yellow-800';
      case ListingStatus.Complete:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to determine if delete should be allowed
  const canDelete = () => {
    return listing.status === ListingStatus.Active && !isExpired();
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <Link href={`/listings/${listing.slug}`}>
          <a className="hover:underline text-sm text-gray-900">
            {listing.title}
          </a>
        </Link>
        <div className="text-sm text-gray-500">
          Time Left: <Countdown 
            expiresAt={listing.expiresAt} 
            showExpiredMessage={true}
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(listing.createdAt).toLocaleDateString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {centsToDollars(listing.currentPrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {centsToDollars(listing.startPrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(listing.status)}`}>
          {listing.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {canDelete() ? (
          <button
            onClick={onDelete}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Delete
          </button>
        ) : (
          <span className="text-gray-400">
            {listing.status === ListingStatus.Active && isExpired() 
              ? 'Expired' 
              : listing.status === ListingStatus.AwaitingPayment 
                ? 'Awaiting Payment' 
                : listing.status === ListingStatus.Complete 
                  ? 'Complete' 
                  : 'Cannot Delete'}
          </span>
        )}
      </td>
    </tr>
  );
};

export default ListingDashboardTableRow;
