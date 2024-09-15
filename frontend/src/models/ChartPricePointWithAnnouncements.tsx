import Announcement from "./Announcement";
import ChartPricePoint from "./ChartPricePoint";

export interface ChartPricePointWithAnnouncements extends ChartPricePoint {
  announcements: Announcement[];
}
