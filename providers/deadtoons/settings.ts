import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Domain / Mirror URL",
      description:
        "Override the Deadtoons domain if deadtoons.sbs is blocked in your region. The site itself suggests using deadtoons.org with a VPN.",
      placeholder: "https://deadtoons.sbs",
      defaultValue: "",
    },
    {
      key: "preferredQuality",
      type: "select",
      label: "Preferred Pack Quality",
      description: "Preferred quality for pack downloads when several are available",
      options: [
        { label: "Auto (Best Available)", value: "auto" },
        { label: "1080p Full HD", value: "1080" },
        { label: "720p HD", value: "720" },
        { label: "480p SD", value: "480" },
      ],
      defaultValue: "auto",
    },
    {
      key: "preferDownload",
      type: "toggle",
      label: "Prefer download links over Watch Online",
      description: "When on, archive download links are listed before AniDisk watch links",
      defaultValue: false,
    },
  ];
};
