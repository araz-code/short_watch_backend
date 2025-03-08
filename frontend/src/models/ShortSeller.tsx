import LargestShortSelling from "./LargestShortSelling";

export default interface ShortSeller {
  id: string;
  name: string;
  current: [LargestShortSelling];
  previous: [string];
  lastUpdated: string;
}
