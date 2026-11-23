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
      description: "Aethoflix site address used for title links.",
      placeholder: "https://aethoflix.live",
      defaultValue: "https://aethoflix.live",
    },
    {
      key: "preferredServer",
      type: "select",
      label: "Preferred Server",
      description: "Which embed server to list first when playing.",
      options: [
        { label: "Auto (Server 1 first)", value: "auto" },
        { label: "Server 1 — Aetho Embed", value: "Aetho Embed" },
        { label: "Server 2 — TheOGPirateBot", value: "TheOGPirateBot" },
        { label: "Server 3 — TG Vid", value: "TG Vid" },
        { label: "Server 4 — VidStuck", value: "VidStuck" },
        { label: "Server 5 — ZXCStream", value: "ZXCStream" },
        { label: "Server 6 — VidFast", value: "VidFast" },
        { label: "Server 7 — Nxsha", value: "Nxsha" },
        { label: "Server 8 — Bingr", value: "Bingr" },
      ],
      defaultValue: "auto",
    },
  ];
};
