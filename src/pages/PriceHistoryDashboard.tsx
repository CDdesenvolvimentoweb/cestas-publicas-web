import React from 'react';
import PriceHistoryDashboard from '@/components/dashboard/PriceHistoryDashboard';

export default function Dashboard() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Análise de dados e estatísticas do sistema
        </p>
      </div>
      
      <PriceHistoryDashboard />
    </div>
  );
}
