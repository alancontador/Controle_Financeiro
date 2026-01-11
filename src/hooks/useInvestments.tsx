import { useState, useMemo } from 'react';

export interface InvestmentAsset {
  id: string;
  name: string;
  type: 'stocks' | 'fixed-income' | 'reits' | 'crypto';
  allocation: number;
  currentValue: number;
  monthlyReturn: number;
  color: string;
}

export interface RetirementSimulation {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
}

export interface ProjectionPoint {
  age: number;
  year: number;
  value: number;
  contributions: number;
}

export interface AssetComparison {
  name: string;
  year1: number;
  year5: number;
  year10: number;
  color: string;
}

const defaultAssets: InvestmentAsset[] = [
  { id: '1', name: 'Ações', type: 'stocks', allocation: 45, currentValue: 329400, monthlyReturn: 1.2, color: 'hsl(255 75% 64%)' },
  { id: '2', name: 'Renda Fixa', type: 'fixed-income', allocation: 35, currentValue: 256200, monthlyReturn: 0.9, color: 'hsl(160 100% 39%)' },
  { id: '3', name: 'FIIs', type: 'reits', allocation: 15, currentValue: 109800, monthlyReturn: 0.7, color: 'hsl(35 100% 50%)' },
  { id: '4', name: 'Cripto', type: 'crypto', allocation: 5, currentValue: 36600, monthlyReturn: 2.5, color: 'hsl(200 100% 50%)' },
];

const assetComparisons: AssetComparison[] = [
  { name: 'CDI', year1: 12.5, year5: 72.3, year10: 175.8, color: 'hsl(160 100% 39%)' },
  { name: 'Ibovespa', year1: 8.2, year5: 48.6, year10: 125.4, color: 'hsl(255 75% 64%)' },
  { name: 'S&P 500', year1: 15.8, year5: 98.5, year10: 245.2, color: 'hsl(200 100% 50%)' },
  { name: 'Bitcoin', year1: 85.2, year5: 520.3, year10: 1850.5, color: 'hsl(35 100% 50%)' },
];

export function useInvestments() {
  const [assets] = useState<InvestmentAsset[]>(defaultAssets);
  const [simulation, setSimulation] = useState<RetirementSimulation>({
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 732000,
    monthlyContribution: 5000,
    expectedReturn: 10,
    inflationRate: 4.5,
  });

  const totalValue = useMemo(() => {
    return assets.reduce((acc, asset) => acc + asset.currentValue, 0);
  }, [assets]);

  const averageMonthlyReturn = useMemo(() => {
    return assets.reduce((acc, asset) => acc + (asset.monthlyReturn * asset.allocation / 100), 0);
  }, [assets]);

  const projections = useMemo((): ProjectionPoint[] => {
    const { currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn, inflationRate } = simulation;
    const years = retirementAge - currentAge;
    const realReturn = (expectedReturn - inflationRate) / 100;
    const monthlyRealReturn = Math.pow(1 + realReturn, 1/12) - 1;
    
    const points: ProjectionPoint[] = [];
    let value = currentSavings;
    let totalContributions = currentSavings;
    const currentYear = new Date().getFullYear();

    for (let i = 0; i <= years; i++) {
      points.push({
        age: currentAge + i,
        year: currentYear + i,
        value: Math.round(value),
        contributions: Math.round(totalContributions),
      });
      
      // Compound monthly for the year
      for (let month = 0; month < 12; month++) {
        value = value * (1 + monthlyRealReturn) + monthlyContribution;
        totalContributions += monthlyContribution;
      }
    }

    return points;
  }, [simulation]);

  const retirementIncome = useMemo(() => {
    const finalValue = projections[projections.length - 1]?.value || 0;
    // 4% rule for safe withdrawal rate
    const annualIncome = finalValue * 0.04;
    return Math.round(annualIncome / 12);
  }, [projections]);

  const updateSimulation = (updates: Partial<RetirementSimulation>) => {
    setSimulation(prev => ({ ...prev, ...updates }));
  };

  return {
    assets,
    totalValue,
    averageMonthlyReturn,
    simulation,
    updateSimulation,
    projections,
    retirementIncome,
    assetComparisons,
  };
}
