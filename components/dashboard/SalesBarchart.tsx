"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NumberTicker from "@/components/ui/number-ticker";
import { TrendingDown, BarChart as ChartIcon, ArrowRight } from "lucide-react";
import { useSalesChartData } from "./hooks/useSalesChartData";

interface SalesChartData {
  date: string;
  meter_type: string;
  total_amount: number;
  user_sales: Record<string, number>;
  user_names: string[];
}

interface ChartData {
  date: string;
  [key: string]: number | string | Record<string, number>;
}

const TIME_PERIODS = {
  "7d": { label: "7 Days", days: 7 },
  "30d": { label: "30 Days", days: 30 },
  "90d": { label: "90 Days", days: 90 },
  "180d": { label: "6 Months", days: 180 },
  "365d": { label: "1 Year", days: 365 },
  all: { label: "All Time", days: 0 },
} as const;

type TimePeriod = keyof typeof TIME_PERIODS;

const chartConfig = {
  integrated: {
    label: "Integrated",
    gradientId: "integratedGradient",
    colors: ["#4F46E5", "#818CF8"], // Indigo gradient
  },
  split: {
    label: "Split",
    gradientId: "splitGradient",
    colors: ["#0EA5E9", "#38BDF8"], // Sky blue gradient
  },
  gas: {
    label: "Gas",
    gradientId: "gasGradient",
    colors: ["#059669", "#34D399"], // Emerald gradient
  },
  water: {
    label: "Water",
    gradientId: "waterGradient",
    colors: ["#2563EB", "#60A5FA"], // Blue gradient
  },
  smart: {
    label: "Smart",
    gradientId: "smartGradient",
    colors: ["#7C3AED", "#A78BFA"], // Violet gradient
  },
  "3 phase": {
    label: "3_Phase",
    gradientId: "threePhaseGradient",
    colors: ["#DC2626", "#F87171"], // Red gradient
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const userSales = payload[0].payload.user_sales || {};
    return (
      <div className='custom-tooltip bg-white p-3 lg:p-4 border rounded shadow max-w-[250px] lg:max-w-none'>
        <p className='label text-sm lg:text-base font-bold'>{`Date: ${new Date(
          label
        ).toLocaleDateString()}`}</p>
        <p className='total text-sm lg:text-base font-semibold'>{`Total: ${payload[0].value} meters`}</p>
        <p className='meter-type text-sm lg:text-base'>{`Type: ${payload[0].dataKey}`}</p>
        <div className='user-breakdown mt-2'>
          <p className='text-sm lg:text-base font-semibold'>Seller(s)</p>
          {Object.entries(userSales).map(([user, amount]) => (
            <p
              key={user}
              className='text-sm lg:text-base'>{`${user}: ${amount} meters`}</p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center h-full p-8 text-gray-500'>
    <div className='relative'>
      <ChartIcon className='w-16 h-16 mb-4 text-gray-300' />
      <TrendingDown className='w-8 h-8 text-gray-400 absolute -bottom-2 -right-2 animate-bounce' />
    </div>
    <div className='text-center space-y-2'>
      <p className='text-lg font-semibold text-gray-600'>No Sales Data Yet</p>
      <p className='text-sm text-gray-400 flex items-center gap-2'>
        Sales will appear here
        <ArrowRight className='w-4 h-4' />
        Beautiful charts incoming!
      </p>
    </div>
  </div>
);

export function SalesBarchart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activeChart, setActiveChart] =
    useState<keyof typeof chartConfig>("integrated");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");
  const [isMounted, setIsMounted] = useState(false);

  // Calculate days based on time period
  const days = useMemo(() => {
    return TIME_PERIODS[timePeriod].days === 0
      ? 3650 // All time (approx 10 years)
      : TIME_PERIODS[timePeriod].days;
  }, [timePeriod]);

  // Use React Query hook for data fetching
  const { data, isLoading, isError } = useSalesChartData(days);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Process data for chart
    const processedData: { [key: string]: ChartData } = {};

    data.forEach((row) => {
      if (!processedData[row.date]) {
        processedData[row.date] = {
          date: row.date,
        };
        Object.keys(chartConfig).forEach((key) => {
          processedData[row.date][key] = 0;
        });
      }

      const chartKey = Object.keys(chartConfig).find(
        (key) => key.toLowerCase() === row.meter_type.toLowerCase()
      );

      if (chartKey) {
        processedData[row.date][chartKey] = row.total_amount;
        processedData[row.date].user_sales = row.user_sales;
      }
    });

    const sortedData = Object.values(processedData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChartData(sortedData);
  }, [data, isMounted]);

  const total = useMemo(() => {
    return Object.keys(chartConfig).reduce(
      (acc, key) => {
        acc[key as keyof typeof chartConfig] = chartData.reduce(
          (sum, day) => sum + ((day[key] as number) || 0),
          0
        );
        return acc;
      },
      {} as Record<keyof typeof chartConfig, number>
    );
  }, [chartData]);

  const renderGradients = () => (
    <defs>
      {Object.entries(chartConfig).map(([key, config]) => (
        <linearGradient
          key={config.gradientId}
          id={config.gradientId}
          x1='0'
          y1='0'
          x2='0'
          y2='1'>
          <stop offset='5%' stopColor={config.colors[0]} stopOpacity={0.9} />
          <stop offset='95%' stopColor={config.colors[1]} stopOpacity={0.9} />
        </linearGradient>
      ))}
    </defs>
  );

  return (
    <Card className='w-full h-full transition-all duration-200 ease-linear relative overflow-hidden'>
      <CardHeader className='flex flex-col items-stretch space-y-4 border-b p-4 lg:p-0 lg:space-y-0 lg:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 lg:px-6 lg:py-6'>
          <div className='flex items-center justify-between'>
            <div className='mr-4'>
              <CardTitle>Sales Chart</CardTitle>
              <CardDescription></CardDescription>
            </div>
            {isMounted ? (
              <Select
                value={timePeriod}
                onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue>{TIME_PERIODS[timePeriod].label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_PERIODS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className='w-[180px] h-9 bg-gray-200 rounded animate-pulse' />
            )}
          </div>
        </div>
        <div className='grid grid-cols-2 lg:flex lg:flex-wrap'>
          {Object.entries(chartConfig).map(([key, config]) => (
            <button
              key={key}
              data-active={activeChart === key}
              className='relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left
                even:border-l data-[active=true]:bg-muted/50
                lg:px-8 lg:py-6
                lg:border-t-0 lg:border-l'
              onClick={() => setActiveChart(key as keyof typeof chartConfig)}>
              <span className='text-xs text-muted-foreground'>
                {config.label}
              </span>
              {total[key as keyof typeof chartConfig] > 0 ? (
                <span className='text-base font-bold leading-none lg:text-3xl'>
                  <NumberTicker
                    value={total[key as keyof typeof chartConfig]}
                    className='text-base font-bold leading-none lg:text-3xl'
                  />
                </span>
              ) : (
                <span className='text-base font-bold leading-none lg:text-3xl text-gray-400'>
                  --
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='p-4 flex-1 w-full' style={{ height: "400px" }}>
        {isLoading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-gray-500'>Loading chart data...</div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                bottom: 5,
                left: 0,
              }}>
              {renderGradients()}
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: "12px",
                  marginTop: "10px",
                }}
              />
              <Bar
                dataKey={activeChart}
                fill={`url(#${chartConfig[activeChart].gradientId})`}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
