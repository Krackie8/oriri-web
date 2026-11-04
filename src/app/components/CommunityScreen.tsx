import React from 'react';
import CommunityDashboard from './CommunityDashboard';

interface CommunityScreenProps {
  isLoggedIn: boolean;
}

export default function CommunityScreen({ isLoggedIn }: CommunityScreenProps) {
  return (
    <div className="pt-[60px] min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <CommunityDashboard />
      </div>
    </div>
  );
}