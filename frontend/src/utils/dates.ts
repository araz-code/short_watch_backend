import i18n from "./i18n";

export const formatTimestamp = (
  timestamp: string,
  formatType: "dateAndTime" | "dateOnly" = "dateAndTime"
) => {
  const date = new Date(timestamp);
  const today = new Date();

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const time = date.toLocaleTimeString(undefined, options);
    return formatType === "dateAndTime"
      ? `${i18n.t("Today")}, ${time}`
      : `${i18n.t("Today")}`;
  }

  if (formatType === "dateAndTime") {
    const options: Intl.DateTimeFormatOptions = {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString(undefined, options);
  }

  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  };

  return date.toLocaleDateString(undefined, options);
};
