"use client";

import { memo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MeterInputFormProps {
  serialNumber: string;
  selectedType: string;
  onSerialNumberChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAddMeter: () => void;
  isChecking: boolean;
  exists: boolean;
  errorMessage: string | React.ReactNode;
}

export const MeterInputForm = memo(function MeterInputForm({
  serialNumber,
  selectedType,
  onSerialNumberChange,
  onTypeChange,
  onAddMeter,
  isChecking,
  exists,
  errorMessage,
}: MeterInputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !exists) {
      e.preventDefault();
      onAddMeter();
    }
  };

  let statusContent;
  if (isChecking) {
    statusContent = (
      <p className='text-sm text-gray-500'>Checking serial number...</p>
    );
  } else if (errorMessage) {
    statusContent = <div className='text-sm text-red-500'>{errorMessage}</div>;
  } else if (serialNumber.trim() && !exists) {
    statusContent = (
      <p className='text-sm text-green-500'>Serial number is available</p>
    );
  } else {
    statusContent = null;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <div className='flex-1'>
          <Input
            type='text'
            placeholder='Scan Serial Number'
            value={serialNumber.toUpperCase()}
            onChange={(e) => onSerialNumberChange(e.target.value)}
            onKeyDown={handleKeyDown}
            required
            maxLength={12}
            className={`${exists ? "border-red-500 focus:ring-red-500" : ""}`}
            ref={inputRef}
            autoFocus
          />
        </div>
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='Split'>Split</SelectItem>
            <SelectItem value='Integrated'>Integrated</SelectItem>
            <SelectItem value='Gas'>Gas</SelectItem>
            <SelectItem value='Water'>Water</SelectItem>
            <SelectItem value='3 Phase'>3 Phase</SelectItem>
            <SelectItem value='Smart'>Smart</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className='cursor-pointer'
          onClick={onAddMeter}
          disabled={!serialNumber || isChecking || exists}>
          Add Meter
        </Button>
      </div>
      <div className='h-6'>{statusContent}</div>
    </div>
  );
});
