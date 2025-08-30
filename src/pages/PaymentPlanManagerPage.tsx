import React from 'react';
import { PaymentPlanManager } from '../components/billing/PaymentPlanManager';

const PaymentPlanManagerPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <PaymentPlanManager />
    </div>
  );
};

export default PaymentPlanManagerPage;