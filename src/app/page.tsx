import { appConfig } from "@config/app.config";
import { ConferencePicker } from "@/components/ConferencePicker";

/** Public landing page: pick a conference, then check papers or get a certificate. */
export default function Home() {
  return (
    <ConferencePicker
      title={appConfig.portalName}
      subtitle="Select your conference to check your paper's format, run the camera-ready check or download your certificate."
      basePath="/c"
    />
  );
}
