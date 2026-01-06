import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { Transaction } from '../types';

interface StatsChartProps {
  transactions: Transaction[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ transactions }) => {
  // Aggregate data by day (last 5 days)
  const processData = () => {
    const days = 5;
    const data = [];
    const today = new Date();
    
    // Create last 5 days buckets
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
      
      data.push({
        name: dateStr,
        study: 0,
        tv: 0,
        dateObj: d
      });
    }

    transactions.forEach(t => {
      const tDate = new Date(t.timestamp);
      const dayData = data.find(d => 
        d.dateObj.getDate() === tDate.getDate() && 
        d.dateObj.getMonth() === tDate.getMonth()
      );
      
      if (dayData) {
        if (t.type === 'deposit' || t.type === 'interest') {
          dayData.study += t.amount;
        } else {
          dayData.tv += t.amount;
        }
      }
    });

    return data;
  };

  const data = processData();

  // Consistent Colors: Green for Study, Red for TV
  const studyColor = '#22c55e'; // green-500
  const tvColor = '#ef4444'; // red-500

  return (
    <div className="h-64 w-full mt-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-500 mb-2 ml-2">최근 5일 활동 현황</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 0,
            left: -10,
            bottom: 0,
          }}
        >
          <XAxis 
            dataKey="name" 
            tick={{fontSize: 11, fill: '#64748b'}} 
            axisLine={false}
            tickLine={false}
            dy={5}
          />
          <YAxis 
            tick={{fontSize: 11, fill: '#64748b'}} 
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{fill: 'transparent'}}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            iconSize={8}
          />
          <Bar dataKey="study" name="공부 적립" fill={studyColor} radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="tv" name="TV 사용" fill={tvColor} radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};