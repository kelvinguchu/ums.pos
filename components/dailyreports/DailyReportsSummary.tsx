import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackageOpen } from "lucide-react";
import NumberTicker from "@/components/ui/number-ticker";
import type { RemainingMetersByType } from "@/components/dailyreports/types";

interface SummaryProps {
  totalEarnings: number;
  remainingMetersByType: RemainingMetersByType[];
}

// Add this interface for agent inventory
interface AgentInventory {
  type: string;
  with_agents: number;
}

// Add this constant at the top of the file
const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

export const DailyReportsSummary = memo(function DailyReportsSummary({
  totalEarnings,
  remainingMetersByType,
  agentInventory,
}: SummaryProps & { agentInventory: AgentInventory[] }) {
  // Function to get agent inventory count for a specific meter type
  const getAgentCount = (meterType: string) => {
    const inventory = agentInventory.find(
      (item) => item.type.toLowerCase() === meterType.toLowerCase()
    );
    return inventory?.with_agents ?? 0;
  };

  // Function to calculate total for each row
  const getTotal = (meterType: string, remaining: number) => {
    const withAgents = getAgentCount(meterType);
    return remaining + withAgents;
  };

  // Ensure all meter types are represented
  const allMeterTypes = METER_TYPES.map((type) => {
    const existingData = remainingMetersByType.find(
      (item) => item.type.toLowerCase() === type.toLowerCase()
    );
    return existingData || { type, remaining_meters: 0 };
  });

  // Calculate grand totals
  const grandTotals = {
    remaining: allMeterTypes.reduce(
      (sum, item) => sum + item.remaining_meters,
      0
    ),
    withAgents: agentInventory.reduce((sum, item) => sum + item.with_agents, 0),
    total: allMeterTypes.reduce(
      (sum, item) => sum + item.remaining_meters + getAgentCount(item.type),
      0
    ),
  };

  return (
    <>
      <Card className="shadow-md hover:shadow-xl">
        <CardHeader>
          <CardTitle>Meters Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-auto'>
            <div className='min-w-[300px] sm:min-w-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter Type</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>With Agents</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMeterTypes.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className='capitalize'>{item.type}</TableCell>
                      <TableCell>{item.remaining_meters}</TableCell>
                      <TableCell>{getAgentCount(item.type)}</TableCell>
                      <TableCell>
                        {getTotal(item.type, item.remaining_meters)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className='font-bold'>
                    <TableCell>Total</TableCell>
                    <TableCell>{grandTotals.remaining}</TableCell>
                    <TableCell>{grandTotals.withAgents}</TableCell>
                    <TableCell>{grandTotals.total}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md hover:shadow-xl">
        <CardHeader>
          <CardTitle>Today's Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {totalEarnings > 0 ? (
            <p className='text-2xl sm:text-4xl font-bold'>
              KES{" "}
              <NumberTicker
                value={totalEarnings}
                className='text-2xl sm:text-4xl font-bold'
              />
            </p>
          ) : (
            <div className='flex flex-col items-center justify-center py-4'>
              <PackageOpen className='h-12 w-12 text-muted-foreground mb-2' />
              <p className='text-muted-foreground text-md'>Empty Coffers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
});
