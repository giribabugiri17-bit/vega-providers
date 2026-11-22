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
      label: "Website URL",
      description: "ThugTV site address used for title links.",
      placeholder: "https://thugtv.st",
      defaultValue: "https://thugtv.st",
    },
    {
      key: "apiBaseUrl",
      type: "text",
      label: "API URL",
      description: "ThugTV API address used for lists, details and streams.",
      placeholder: "https://api.thugtv.online/api",
      defaultValue: "https://api.thugtv.online/api",
    },
    {
      key: "preferredQuality",
      type: "select",
      label: "Preferred Quality",
      description: "Default streaming resolution.",
      options: [
        { label: "Auto", value: "auto" },
        { label: "1080p", value: "1080" },
        { label: "720p", value: "720" },
        { label: "480p", value: "480" },
      ],
      defaultValue: "auto",
    },
    {
      key: "preferDownload",
      type: "toggle",
      label: "Prefer Downloads",
      description: "Only return direct download-friendly (HLS) servers.",
      defaultValue: false,
    },
  ];
};
