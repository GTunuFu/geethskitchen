import ChefApp from "./ChefApp";
import { HER_NAME } from "@/lib/auth";

export default function Page() {
  return <ChefApp herName={HER_NAME} />;
}
