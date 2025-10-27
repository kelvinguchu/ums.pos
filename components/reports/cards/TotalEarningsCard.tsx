import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, PackageOpen } from "lucide-react";
import { EmptyState } from "./EmptyState";
import NumberTicker from "@/components/ui/number-ticker";

interface TotalEarningsCardProps {
  total: number;
}

export function TotalEarningsCard({ total }: Readonly <TotalEarningsCardProps>) {
  return (
    <Card className='shadow-md hover:shadow-xl'>
      <CardHeader className='flex flex-row items-center justify-between p-4 md:p-6'>
        <CardTitle className='text-lg md:text-xl'>Total Earnings</CardTitle>
        <DollarSign className='w-5 h-5 text-[#E46020]' />
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {total > 0 ? (
          <p className='text-2xl md:text-4xl font-bold'>
            KES{" "}
            <NumberTicker
              value={total}
              className='text-2xl md:text-4xl font-bold inline-block'
            />
          </p>
        ) : (
          <EmptyState icon={PackageOpen} message='No earnings recorded' />
        )}
      </CardContent>
    </Card>
  );
}
