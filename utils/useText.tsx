import texts from "@/datas/texts.json";
import type { RootState } from "@/redux/store";
import { useSelector } from "react-redux";

export const useT = () => {
  const lang = useSelector((s: RootState) => s.settings.language);
  return (key: string) => {
    const node = (texts as any)[key];
    if (!node) return key;
    return node[lang] ?? node["en"] ?? key;
  };
};

export default useT;