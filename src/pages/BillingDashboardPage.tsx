import React from 'react';
import { BillingDashboard } from '../components/billing/BillingDashboard';

const BillingDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <BillingDashboard />
    </div>
  );
};

export default BillingDashboardPage;