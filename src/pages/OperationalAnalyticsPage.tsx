import React from 'react';
import { OperationalAnalyticsDashboard } from '../components/analytics/OperationalAnalyticsDashboard';

const OperationalAnalyticsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <OperationalAnalyticsDashboard />
    </div>
  );
};

export default OperationalAnalyticsPage;