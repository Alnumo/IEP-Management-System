import React from 'react';
import { FinancialAnalytics } from '../components/analytics/FinancialAnalytics';

const FinancialAnalyticsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <FinancialAnalytics />
    </div>
  );
};

export default FinancialAnalyticsPage;