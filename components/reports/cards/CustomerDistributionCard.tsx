import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { meterTypeConfig } from "../utils/meterTypeConfig";
import type { CustomerTypeData } from "../types";

interface CustomerDistributionCardProps {
  data: CustomerTypeData[];
  sidebarState: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{payload[0].payload.type}</p>
        <p className="text-sm text-muted-foreground">
          Count: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function CustomerDistributionCard({ data, sidebarState }: CustomerDistributionCardProps) {
  const getMostCommonType = () => {
    if (!data.length) return 'N/A';
    return data.reduce((prev, current) => 
      prev.count > current.count ? prev : current
    ).type;
  };

  return (
    <Card className={cn(
      'shadow-md hover:shadow-xl',
      sidebarState === "expanded" 
        ? 'col-span-full lg:col-span-2' 
        : 'col-span-full lg:col-span-2'
    )}>
      <CardHeader className="items-center">
        <CardTitle>Customer Distribution</CardTitle>
        <CardDescription>
          Distribution of sales by customer type
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <div className='h-[300px] w-full'>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 0, right: 30, bottom: 0, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="type"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Customers"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                dot={{
                  r: 4,
                  fill: "hsl(var(--primary))",
                  fillOpacity: 1,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Most common: {getMostCommonType()}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          Based on all sales data
        </div>
      </CardFooter>
    </Card>
  );
} 