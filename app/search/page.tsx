import type { Metadata } from "next";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search Golf Courses",
  description: "Search every golf course in the United States by name, city, or state.",
};

export default function SearchPage() {
  return <SearchClient />;
}
