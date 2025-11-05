import AddPasswordModal from "@/components/AddPasswordModal";
import CategoryAccordion from "@/components/CategoryAccordion";
import Fab from "@/components/Fab";
import Header from "@/components/Header";
import PasswordDetailModal from "@/components/PasswordDetailModal";
import type { PasswordItem } from "@/redux/slices/pwdSlice";
import { RootState } from "@/redux/store";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const Index = () => {
  const t = useT();
  const categories = useSelector((s: RootState) => s.categories.items);
  const passwords = useSelector((s: RootState) => s.passwords.items);
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

  const data = useMemo(() => {
    const arr = categories.map((c : any) => ({
      id: c.id,
      name: c.name,
      items: grouped.get(c.id) ?? [],
    }));
    const uncats = grouped.get("uncategorized") ?? [];
    if (uncats.length) {
      arr.push({ id: "uncategorized", name: "Sans catégorie", items: uncats });
    }
    return arr;
  }, [categories, grouped]);

  
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
      <Header onOpenSettings={() => router.push("/settings")} />
      <View style={styles.content}>
        {/* Search bar (filtre par catégorie ou mot de passe) */}
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
