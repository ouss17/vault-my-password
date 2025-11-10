import AddPasswordModal from "@/components/AddPasswordModal";
import CategoryAccordion from "@/components/CategoryAccordion";
import Fab from "@/components/Fab";
import Header from "@/components/Header";
import LanguageSelectionModal from "@/components/LanguageSelectionModal";
import PasswordDetailModal from "@/components/PasswordDetailModal";
import type { PasswordItem } from "@/redux/slices/pwdSlice";
import { finalizeFirstRun, initializeFirstRun } from "@/redux/slices/settingsSlice";
import type { AppDispatch } from "@/redux/store";
import { RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

// import AsyncStorage from '@react-native-async-storage/async-storage';


const Index = () => {
  // const clearAll = async () => {
  //   try {
  //     await AsyncStorage.clear();
  //     console.log('Local storage vidé !');
  //   } catch (e) {
  //     console.error('Erreur lors du nettoyage', e);
  //   }
  // };
  // clearAll();
  const t = useT();
  const categories = useSelector((s: RootState) => s.categories.items);
  const passwords = useSelector((s: RootState) => s.passwords.items);
  const settings = useSelector((s: RootState) => s.settings);
  const dispatch = useDispatch<AppDispatch>();
  const [sortOrder, setSortOrder] = useState<"az" | "za" | null>(null);
  const [categorySort, setCategorySort] = useState<"az" | "za" | null>(null);
  const [query, setQuery] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PasswordItem | null>(null); 
  const [detailId, setDetailId] = useState<string | null>(null);
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof passwords>();
    passwords.forEach((p : any) => {
      const key = p.categoryId ?? "uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [passwords]);

  // run initialization (no-op if language setup is still required)
  React.useEffect(() => {
    dispatch(initializeFirstRun());
  }, [dispatch]);
 
  const handleCategorySortPress = () => {
    Alert.alert(
      t("sort.categories.title") ?? "Sort categories",
      undefined,
      [
        { text: "A → Z", onPress: () => setCategorySort("az") },
        { text: "Z → A", onPress: () => setCategorySort("za") },
        { text: t("common.cancel"), style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const data = useMemo(() => {
    
    const parseTs = (v: any) => (typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) || 0 : 0);
    const unitToMs = (unit: "days" | "months" | "years", val: number) => {
      const days =
        unit === "days" ? val : unit === "months" ? val * 30 : /* years */ val * 365;
      return days * 24 * 60 * 60 * 1000;
    };

    const oldIds = new Set<string>();
    if (settings.oldPasswordMarkerEnabled) {
      const thresholdVal = Math.max(1, Number(settings.oldPasswordThresholdValue ?? 1));
      const thresholdUnit = settings.oldPasswordThresholdUnit ?? "months";
      const thresholdMs = unitToMs(thresholdUnit, thresholdVal);
      const now = Date.now();
      for (const p of passwords) {
        const cts = parseTs((p as any).createdAt);
        const uts = parseTs((p as any).updatedAt);
        const last = Math.max(cts || 0, uts || 0);
        if (last > 0 && now - last > thresholdMs) oldIds.add(p.id);
      }
    }

    const arr = categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      
      items: (grouped.get(c.id) ?? []).map((it: any) => ({ ...(it as any), isOld: oldIds.has(it.id) })),
    }));
    const uncats = (grouped.get("uncategorized") ?? []).map((it: any) => ({ ...(it as any), isOld: oldIds.has(it.id) }));
    if (uncats.length) {
      arr.push({ id: "uncategorized", name: "Sans catégorie", items: uncats });
    }

    // sort categories themselves if requested
    if (categorySort) {
      const locale = (settings?.language as string) ?? "fr";
      arr.sort((a: any, b: any) => {
        const aName = (a.name ?? "").toString();
        const bName = (b.name ?? "").toString();
        return categorySort === "az"
          ? aName.localeCompare(bName, locale, { sensitivity: "base" })
          : bName.localeCompare(aName, locale, { sensitivity: "base" });
      });
    }

    // apply sorting to items within each category if requested
    if (sortOrder) {
      const locale = (settings?.language as string) ?? "fr";
      for (const cat of arr) {
        cat.items = [...(cat.items ?? [])].sort((a: any, b: any) => {
          const aName = (a.name ?? "").toString();
          const bName = (b.name ?? "").toString();
          return sortOrder === "az"
            ? aName.localeCompare(bName, locale, { sensitivity: "base" })
            : bName.localeCompare(aName, locale, { sensitivity: "base" });
        });
      }
    }
     return arr;
  }, [categories, grouped, passwords, settings, sortOrder, categorySort]);

  
  const filteredData = useMemo(() => {
    const q = (query ?? "").toString().trim().toLowerCase();
    if (!q) return data;
    return data
      .map((cat : any) => {
        const catName = (cat.name ?? "").toString().toLowerCase();
        if (catName.includes(q)) {
          
          return cat;
        }
        
        const items = (cat.items ?? []).filter((p: any) => {
          const name = (p.name ?? "").toString().toLowerCase();
          return name.includes(q);
        });
        if (items.length) return { ...cat, items };
        return null;
      })
      .filter(Boolean) as typeof data;
  }, [data, query]);

  const handleEditFromDetail = (item: PasswordItem) => {
    setDetailId(null);
    setEditItem(item);
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setEditItem(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        onOpenSettings={() => router.push("/settings")}
        onOpenCategorySort={handleCategorySortPress}
      />
      <View style={styles.content}>
        
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.searchClear}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t("home.empty")}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CategoryAccordion
                categoryId={item.id}
                categoryName={item.name === "uncategorized" ? t("settings.importExport.uncategorized") : item.name}
                items={item.items}
                onReveal={(id) => setDetailId(id)}
              />
            )}
          />
        )}
      </View>

      <Fab onPress={() => setShowAdd(true)} />

      <AddPasswordModal visible={showAdd} onClose={handleCloseAdd} initialItem={editItem} />

      <PasswordDetailModal
        visible={detailId != null}
        passwordId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={handleEditFromDetail} 
      />

      {/* Language selection shown at first launch when language not set yet */}
      <LanguageSelectionModal
        visible={!!(settings?.isFirstLaunch && settings?.needsLanguageSetup)}
        onSelect={(lang) => {
          // finalizeFirstRun will set language, create localized categories/examples and mark first launch done
          dispatch(finalizeFirstRun(lang));
        }}
      />

    </SafeAreaView>
  );
};

const colors = {
  background: "#072033",
  card: "#0b3a50",
  surface: "#093a54",
  textPrimary: "#e6f7ff",
  textSecondary: "#9ec5ea",
  muted: "#84a7c6",
  accent: "#1e90ff",
  translucentBackdrop: "rgba(2,8,14,0.7)",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 110 },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  searchClear: { marginLeft: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSecondary },
  settingsPlaceholder: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    elevation: 6,
  },
});

export default Index;
