import React from "react";

const Offline = () => {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-4'>
      <h1 className='text-2xl font-bold text-[#000080] mb-4'>
        You are offline
      </h1>
      <p className='text-gray-600 text-center'>
        Please check your internet connection and try again
      </p>
    </div>
  );
};

export default Offline;
