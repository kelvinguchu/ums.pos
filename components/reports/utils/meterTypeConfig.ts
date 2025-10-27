export const meterTypeConfig = {
  integrated: {
    colors: ["#4F46E5", "#818CF8"], // Indigo
    bgColor: "bg-indigo-200",
    textColor: "text-indigo-900",
    borderColor: "border-indigo-400",
  },
  split: {
    colors: ["#0EA5E9", "#38BDF8"], // Sky blue
    bgColor: "bg-sky-200",
    textColor: "text-sky-900",
    borderColor: "border-sky-400",
  },
  gas: {
    colors: ["#059669", "#34D399"], // Emerald
    bgColor: "bg-emerald-200",
    textColor: "text-emerald-900",
    borderColor: "border-emerald-400",
  },
  water: {
    colors: ["#2563EB", "#60A5FA"], // Blue
    bgColor: "bg-blue-200",
    textColor: "text-blue-900",
    borderColor: "border-blue-400",
  },
  smart: {
    colors: ["#7C3AED", "#A78BFA"], // Violet
    bgColor: "bg-violet-200",
    textColor: "text-violet-900",
    borderColor: "border-violet-400",
  },
  "3 phase": {
    colors: ["#DC2626", "#F87171"], // Red
    bgColor: "bg-red-200",
    textColor: "text-red-900",
    borderColor: "border-red-400",
  },
};

export const getMeterTypeBadgeClass = (type: string) => {
  const config =
    meterTypeConfig[type.toLowerCase() as keyof typeof meterTypeConfig];
  return config
    ? `${config.bgColor} ${config.textColor} ${config.borderColor} border font-medium no-underline`
    : "bg-gray-200 text-gray-900 border border-gray-400 font-medium no-underline";
};
