import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Copy, Pencil } from "lucide-react";

interface SaleDetailsHeaderProps {
  transactionRef: string | null;
  isRefLoading: boolean;
  isCopying: boolean;
  onCopy: () => void;
  onOpenNoteDialog: () => void;
  hasNote: boolean;
  saleDate: Date | null;
}

export function SaleDetailsHeader({
  transactionRef,
  isRefLoading,
  isCopying,
  onCopy,
  onOpenNoteDialog,
  hasNote,
  saleDate,
}: SaleDetailsHeaderProps) {
  const formattedDate = saleDate
    ? saleDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <SheetHeader className='space-y-1 pb-2'>
      <SheetTitle className='flex items-center gap-2 text-xl'>
        <span>Sale Details</span>
        <Badge variant='outline' className='bg-blue-100'>
          {isRefLoading ? (
            <span className='animate-pulse'>Loading...</span>
          ) : (
            <div className='flex items-center gap-1'>
              <span>{transactionRef || "No Reference"}</span>
              {transactionRef && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 ml-1 rounded-full cursor-pointer'
                  onClick={onCopy}
                  title='Copy reference number'>
                  {isCopying ? (
                    <Check className='h-3 w-3 text-green-600' />
                  ) : (
                    <Copy className='h-3 w-3 text-gray-500 hover:text-gray-800' />
                  )}
                </Button>
              )}
            </div>
          )}
        </Badge>
        <Button
          variant='ghost'
          size='icon'
          onClick={(event) => {
            event.stopPropagation();
            onOpenNoteDialog();
          }}
          className='h-8 w-8 cursor-pointer'
          title={hasNote ? "Update note" : "Add note"}>
          <Pencil
            className={`h-4 w-4 ${hasNote ? "text-blue-600" : "text-gray-400"}`}
          />
        </Button>
      </SheetTitle>
      <SheetDescription className='flex items-center gap-2 text-sm'>
        <span>Sold on {formattedDate}</span>
      </SheetDescription>
    </SheetHeader>
  );
}
