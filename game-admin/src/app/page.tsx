import { redirect } from "next/navigation";

export default function Home() {
  // Redirect root to login page so admin users see login immediately
  redirect("/login");
}
