import React from 'react';
import { ClinicalAnalyticsDashboard } from '../components/analytics/ClinicalAnalyticsDashboard';

const ClinicalAnalyticsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <ClinicalAnalyticsDashboard />
    </div>
  );
};

export default ClinicalAnalyticsPage;