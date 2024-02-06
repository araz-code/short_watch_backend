export const formatTimestampAsDateAndTime = (timestamp: string) => {
  const date = new Date(timestamp);

  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return date.toLocaleDateString(undefined, options);
};

export const formatTimestampAsDateOnly = (timestamp: string) => {
  const date = new Date(timestamp);

  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  };

  return date.toLocaleDateString(undefined, options);
};
