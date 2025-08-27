import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';
import AppContext from '../context/app-context';

const Profile = () => {
  const router = useRouter();
  const { auth } = useContext(AppContext);

  useEffect(() => {
    // Make sure we're in the browser
    if (typeof window !== 'undefined') {
      if (auth.isAuthenticated && auth.currentUser?.name) {
        // Redirect to user's profile
        router.push(`/profile/${auth.currentUser.name}`);
      } else {
        // Redirect to sign in page
        router.push('/auth/signin');
      }
    }
  }, [auth.isAuthenticated, auth.currentUser, router]);

  return <h1>Redirecting...</h1>;
};

export default Profile;
