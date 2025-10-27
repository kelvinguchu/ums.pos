import { Badge } from "@/components/ui/badge";
import { X, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUploadHandler } from "./FileUploadHandler";

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface FormActionsProps {
  currentUser: {
    id: string;
    name: string;
  };
  currentMeters: Meter[];
  onMetersAdd: (meters: Meter[]) => void;
  onClear: () => void;
}

export function FormActions({
  currentUser,
  currentMeters,
  onMetersAdd,
  onClear,
}: Readonly<FormActionsProps>) {
  const handleTemplateDownload = (type: "csv" | "xlsx") => {
    const filename = type === "csv" ? "ctemplate.csv" : "xtemplate.xlsx";
    const link = document.createElement("a");
    link.href = `/exceltemplates/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='flex items-center gap-2'>
      <FileUploadHandler
        onMetersAdd={onMetersAdd}
        currentUser={currentUser}
        currentMeters={currentMeters}
      />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className='cursor-pointer'>
            <Badge
              variant='outline'
              className='hover:bg-gray-100 flex items-center gap-1 cursor-pointer w-[100px] justify-center'>
              <FileDown className='h-3 w-3' />
              Templates
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuItem
            onClick={() => handleTemplateDownload("csv")}
            className='cursor-pointer'>
            Download CSV Template
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTemplateDownload("xlsx")}
            className='cursor-pointer'>
            Download Excel Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Badge
        onClick={onClear}
        variant='outline'
        className='hover:bg-gray-100 flex items-center gap-1 cursor-pointer w-[100px] justify-center whitespace-nowrap'>
        <X className='h-3 w-3' />
        Clear
      </Badge>
    </div>
  );
}
