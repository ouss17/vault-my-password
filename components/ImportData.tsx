import { setCategories } from "@/redux/slices/categoriesSlice";
import { setPasswords } from "@/redux/slices/pwdSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import { setLockSuspended } from "@/utils/lockSuspend";
import { useT } from "@/utils/useText";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";


const errorMessage = (err: unknown) => {
  if (!err) return String(err);
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

export default function ImportData() {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((st: RootState) => st.categories.items);
  const passwords = useSelector((st: RootState) => st.passwords.items);
  const t = useT();

  const handleImport = async () => {
    setLockSuspended(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      const r = res as any;

      const cancelled =
        r === null ||
        r === undefined ||
        r.type === "cancel" ||
        r.type === "cancelled" ||
        r.type === "dismiss" ||
        r.type === "canceled" ||
        r.canceled === true;
      if (cancelled) {
        Alert.alert(t("import.button"), t("alerts.import.noFileSelected"));
        return;
      }

      const uri: string | undefined = r.uri ?? r.fileCopyUri ?? r.assets?.[0]?.uri ?? r.assets?.[0]?.fileCopyUri;
      if (!uri) {
        Alert.alert(t("alert.error.title"), t("alerts.import.cannotRetrieveFile"));
        return;
      }

      const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" } as any);
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        console.error("Import parse error:", err);
        Alert.alert(t("alert.error.title"), t("alerts.import.invalidJson"));
        return;
      }

      
      const tryFind = (obj: any) => {
        if (!obj || typeof obj !== "object") return { cats: [], pwds: [] };
        const cats =
          Array.isArray(obj.categories) ? obj.categories : Array.isArray(obj.categories?.items) ? obj.categories.items : [];
        const pwds =
          Array.isArray(obj.passwords) ? obj.passwords : Array.isArray(obj.passwords?.items) ? obj.passwords.items : [];
        return { cats, pwds };
      };

      let categoriesArray: any[] = [];
      let passwordsArray: any[] = [];

      const tries = [parsed, parsed.payload, parsed.exported, parsed.data, parsed.dump].filter(Boolean);
      for (const ttry of tries) {
        const { cats, pwds } = tryFind(ttry);
        if (cats.length) categoriesArray.push(...cats);
        if (pwds.length) passwordsArray.push(...pwds);
      }

      if (categoriesArray.length === 0 && passwordsArray.length === 0) {
        
        for (const k of Object.keys(parsed)) {
          const v = parsed[k];
          if (Array.isArray(v) && v.length && typeof v[0] === "object") {
            const sample = v[0];
            if ("name" in sample && "id" in sample) {
              categoriesArray.push(...v);
            } else {
              if (
                "username" in sample ||
                "password" in sample ||
                "mdp" in sample ||
                "site" in sample ||
                "website" in sample ||
                "title" in sample ||
                "name" in sample
              ) {
                passwordsArray.push(...v);
              }
            }
          }
        }
      }

      if (categoriesArray.length === 0 && passwordsArray.length === 0) {
        Alert.alert(t("alert.error.title"), t("alerts.import.noData"));
        return;
      }

      
      const genId = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const normalizeCats = categoriesArray.map((c: any) => ({ ...c, id: c.id ?? genId() }));
      const normalizePwds = passwordsArray.map((p: any) => ({ ...p, id: p.id ?? genId() }));

      
      const existingCatIds = new Set(categories.map((c: any) => c.id));
      const existingPwdIds = new Set(passwords.map((p: any) => p.id));

      const normalizeName = (s: any) => (typeof s === "string" ? s.trim().toLowerCase() : "");
      const pwdKey = (p: any) => {
        const title = (p.title ?? p.name ?? "").toString().trim().toLowerCase();
        const site = (p.site ?? p.website ?? "").toString().trim().toLowerCase();
        const user = (p.username ?? "").toString().trim().toLowerCase();
        return `${title}|${site}|${user}`;
      };

      const existingCatNames = new Set(categories.map((c: any) => normalizeName(c.name)));
      const existingPwdKeys = new Set(passwords.map((p: any) => pwdKey(p)));

      const incomingCatNamesSeen = new Set<string>();
      const incomingPwdKeysSeen = new Set<string>();

      const catsToAdd = normalizeCats.filter((c) => {
        if (!c) return false;
        if (c.id != null && existingCatIds.has(c.id)) return false;
        const n = normalizeName(c.name);
        if (!n) return false;
        if (existingCatNames.has(n)) return false;
        if (incomingCatNamesSeen.has(n)) return false;
        incomingCatNamesSeen.add(n);
        return true;
      });

      const pwdsToAdd = normalizePwds.filter((p) => {
        if (!p) return false;
        if (p.id != null && existingPwdIds.has(p.id)) return false;
        const k = pwdKey(p);
        if (!k || k === "||" || k === "| |") return false;
        if (existingPwdKeys.has(k)) return false;
        if (incomingPwdKeysSeen.has(k)) return false;
        incomingPwdKeysSeen.add(k);
        return true;
      });

      if (catsToAdd.length === 0 && pwdsToAdd.length === 0) {
        Alert.alert(t("import.button"), t("alerts.import.nothingToImport"));
        return;
      }

      
      try {
        if (catsToAdd.length > 0) dispatch(setCategories([...categories, ...catsToAdd]));
        if (pwdsToAdd.length > 0) dispatch(setPasswords([...passwords, ...pwdsToAdd]));
        const successMsg = t("alerts.import.successDetails")
          .replace("{cats}", String(catsToAdd.length))
          .replace("{pwds}", String(pwdsToAdd.length));
        Alert.alert(t("alerts.import.success"), successMsg);
      } catch (applyErr: any) {
        console.error("Import apply error:", applyErr);
        const msg = t("alerts.import.applyError").replace("{error}", errorMessage(applyErr));
        Alert.alert(t("alert.error.title"), msg);
      }
    } catch (e: any) {
      console.error("Import error:", e);
      const msg = t("alerts.import.finalError").replace("{error}", errorMessage(e));
      Alert.alert(t("alert.error.title"), msg);
    } finally {
      setLockSuspended(false);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleImport}>
      <Text style={styles.btnText}>{t("import.button")}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 10, backgroundColor: "#1e90ff", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});