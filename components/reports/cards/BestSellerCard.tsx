import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface BestSellerCardProps {
  product: string;
}

export function BestSellerCard({ product }: BestSellerCardProps) {
  return (
    <Card className='shadow-md hover:shadow-xl'>
      <CardHeader className='flex flex-row items-center justify-between p-4 md:p-6'>
        <CardTitle className='text-lg md:text-xl'>Best Seller</CardTitle>
        <Award className='w-5 h-5 text-[#E46020]' />
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {product ? (
          <p className='text-2xl font-bold capitalize'>{product}</p>
        ) : (
          <EmptyState icon={Award} message='No best seller data' />
        )}
      </CardContent>
    </Card>
  );
}
