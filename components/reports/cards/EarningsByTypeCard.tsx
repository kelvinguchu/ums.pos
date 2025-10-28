import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { MeterTypeEarnings } from "../types";

interface EarningsByTypeCardProps {
  earnings: MeterTypeEarnings[];
}

export function EarningsByTypeCard({ earnings }: EarningsByTypeCardProps) {
  return (
    <Card className='shadow-md hover:shadow-xl'>
      <CardHeader className='flex flex-row items-center justify-between p-4 md:p-6'>
        <CardTitle className='text-lg md:text-xl'>Earnings by Type</CardTitle>
        <BarChart3 className='w-5 h-5 text-primary' />
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {earnings.length > 0 ? (
          <div className='overflow-x-auto'>
            {/* Mobile View */}
            <div className='md:hidden space-y-4'>
              {earnings.map((item, index) => (
                <div key={index} className='flex justify-between items-center'>
                  <span className='font-medium capitalize'>
                    {item.meter_type}
                  </span>
                  <span>KES {item.total_earnings.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className='hidden md:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className='text-right'>Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className='capitalize'>
                        {item.meter_type}
                      </TableCell>
                      <TableCell className='text-right'>
                        KES {item.total_earnings.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <EmptyState icon={BarChart3} message='No earnings data available' />
        )}
      </CardContent>
    </Card>
  );
}
