import { getSettings } from "@/actions/settings";
import { SettingsBoard } from "@/components/modules/settings/settings-board";

// Preferences for the one account: profile, theme, digest and todo retention.
// Module visibility is not here on purpose, it is build-time config.
export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsBoard settings={settings} />;
}
