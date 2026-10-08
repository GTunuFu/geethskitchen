import HerApp from "./HerApp";
import { HER_NAME } from "@/lib/auth";

export default function Page() {
  return <HerApp herName={HER_NAME} />;
}
