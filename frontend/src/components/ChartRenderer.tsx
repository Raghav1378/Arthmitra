import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartRendererProps {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: ChartData[];
  title?: string;
}

const COLORS = ['#2456b4', '#c9992b', '#5289e8', '#f59e0b', '#ef4444', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl border border-ink-900/10 p-3 rounded-xl shadow-[0_10px_40px_rgba(16,48,110,0.12)]">
        <p className="text-[10px] font-black uppercase tracking-widest text-parchment-faint mb-1">{label}</p>
        <p className="text-sm font-bold text-emerald-700">
          {payload[0].value.toLocaleString()} 
          <span className="text-[10px] text-parchment-faint ml-1">Value</span>
        </p>
      </div>
    );
  }
  return null;
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, title }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-72 mt-6 p-6 bg-white/60 border border-ink-900/10 rounded-[2rem] shadow-2xl backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {title && (
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-parchment-faint mb-6 text-center">
          {title}
        </h4>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2456b4" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#346fd8" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#10306e10" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#10306e08' }} />
            <Bar 
              dataKey="value" 
              fill="url(#barGrad)" 
              radius={[6, 6, 0, 0]} 
              animationDuration={1500}
              activeBar={{ fill: '#2456b4', stroke: '#2456b4', strokeWidth: 2, fillOpacity: 1 }}
            />
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#10306e10" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#2456b4" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#ffffff', stroke: '#2456b4', strokeWidth: 2 }} 
              activeDot={{ r: 7, fill: '#2456b4', strokeWidth: 0 }}
              animationDuration={2000}
            />
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2456b4" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#2456b4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#10306e10" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#2456b4" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorArea)" 
              animationDuration={2000}
            />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={8}
              dataKey="value"
              animationBegin={200}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="rgba(16,48,110,0.1)"
                  strokeWidth={2}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold', color: '#44536f' }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
