import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { TopSeller } from "../types";

interface TopSellersCardProps {
  topSellers: TopSeller[];
}

export function TopSellersCard({ topSellers }: TopSellersCardProps) {
  return (
    <Card className='shadow-md hover:shadow-xl'>
      <CardHeader className='flex flex-row items-center justify-between p-4 md:p-6'>
        <CardTitle className='text-lg md:text-xl'>Top Sellers</CardTitle>
        <Users className='w-5 h-5 text-primary' />
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {topSellers.length > 0 ? (
          <div className='overflow-x-auto'>
            {/* Mobile View */}
            <div className='md:hidden space-y-4'>
              {topSellers.map((seller, index) => (
                <div key={index} className='flex justify-between items-center'>
                  <span className='font-medium'>{seller.user_name}</span>
                  <span>KES {seller.total_sales.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className='hidden md:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className='text-right'>Total Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellers.map((seller, index) => (
                    <TableRow key={index}>
                      <TableCell>{seller.user_name}</TableCell>
                      <TableCell className='text-right'>
                        KES {seller.total_sales.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <EmptyState icon={Users} message='No seller data available' />
        )}
      </CardContent>
    </Card>
  );
}
