import Agents from "@/components/agents/Agents";

const AgentsPage = () => {
  return (
    <div
      className='container mx-auto px-2 sm:px-4 mt-20 sm:mt-8'>
      <h1 className='text-3xl font-bold text-center drop-shadow-lg'>UMS Kenya Agents</h1>
      <Agents />
    </div>
  );
};

export default AgentsPage;
