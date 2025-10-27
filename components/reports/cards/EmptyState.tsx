import { EmptyStateProps } from "../types";

export const EmptyState = ({ icon: Icon, message }: EmptyStateProps) => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <Icon className='w-12 h-12 mb-4' />
    <p className='text-sm'>{message}</p>
  </div>
); 