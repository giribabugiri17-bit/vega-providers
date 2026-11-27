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
        "Override the AtoZCartoonist domain if atozcartoonist.com is blocked in your region. The site also uses atozcartoonist.me as a mirror.",
      placeholder: "https://www.atozcartoonist.com",
      defaultValue: "",
    },
  ];
};
