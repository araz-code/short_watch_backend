import Announcement from "./Announcement";

export default interface ShortSellerDetails {
  id: string;
  name: string;
  announcements: [Announcement];
}
