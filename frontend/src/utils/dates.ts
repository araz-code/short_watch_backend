import i18n from "./i18n";

export const formatTimestamp = (
  timestamp: string,
  // "todayWithTime": show the time when the date is today, but only the date
  // otherwise (used by compact lists that still want a precise "today" stamp).
  formatType: "dateAndTime" | "dateOnly" | "todayWithTime" = "dateAndTime"
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
    // dateOnly shows just "Today"; dateAndTime and todayWithTime add the time.
    return formatType === "dateOnly"
      ? `${i18n.t("Today")}`
      : `${i18n.t("Today")}, ${time}`;
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
