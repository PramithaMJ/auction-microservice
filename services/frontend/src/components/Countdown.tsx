import React, { Fragment, useEffect } from 'react';
import { useState } from 'react';

interface IProps {
  expiresAt: string;
  onExpired?: () => void; // Optional callback when auction expires
  showExpiredMessage?: boolean; // Whether to show "Expired" or just empty
}

const Countdown = ({ expiresAt, onExpired, showExpiredMessage = true }: IProps) => {
  const [countDownData, setCountDownData] = useState({
    timeleft: 'Loading countdown . .',
    expired: false,
  });

  const { timeleft, expired } = countDownData;

  useEffect(() => {
    countdownTimer();

    const interval = setInterval(() => {
      if (expired) return clearInterval(interval);
      countdownTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [expired]);

  const countdownTimer = () => {
    const countDownDate = Date.parse(expiresAt);
    const now = Date.now();

    const distance = countDownDate - now;

    if (distance <= 0) {
      setCountDownData({
        timeleft: showExpiredMessage ? 'Expired' : '',
        expired: true,
      });
      
      // Call the onExpired callback if provided
      if (onExpired && !expired) {
        onExpired();
      }
      return; // Stop execution here to prevent negative values
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setCountDownData({
      timeleft: days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's ',
      expired: false,
    });
  };

  // Add styling based on expiration status
  const getTimeLeftStyle = () => {
    if (expired) {
      return 'text-red-600 font-semibold';
    }
    
    // Parse remaining time to show urgency
    const countDownDate = Date.parse(expiresAt);
    const now = Date.now();
    const distance = countDownDate - now;
    const hoursLeft = distance / (1000 * 60 * 60);
    
    if (hoursLeft < 1) {
      return 'text-red-500 font-semibold animate-pulse'; // Less than 1 hour - urgent
    } else if (hoursLeft < 24) {
      return 'text-orange-500 font-medium'; // Less than 24 hours - warning
    } else {
      return 'text-gray-700'; // Normal
    }
  };

  return <span className={getTimeLeftStyle()}>{timeleft}</span>;
};

export default Countdown;
