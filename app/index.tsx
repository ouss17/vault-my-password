import AddPasswordModal from "@/components/AddPasswordModal";
import CategoryAccordion from "@/components/CategoryAccordion";
import Fab from "@/components/Fab";
import Header from "@/components/Header";
import PasswordDetailModal from "@/components/PasswordDetailModal";
import type { PasswordItem } from "@/redux/slices/pwdSlice";
import { RootState } from "@/redux/store";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const Index = () => {
  const categories = useSelector((s: RootState) => s.categories.items);
  const passwords = useSelector((s: RootState) => s.passwords.items);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PasswordItem | null>(null); // new: item to edit
  const [detailId, setDetailId] = useState<string | null>(null);
  const router = useRouter();

  // group passwords by categoryId for quick lookup
  const grouped = useMemo(() => {
    const map = new Map<string, typeof passwords>();
    passwords.forEach((p : any) => {
      const key = p.categoryId ?? "uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [passwords]);

  // Build data to render: categories + an "Uncategorized" if needed
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

  const handleEditFromDetail = (item: PasswordItem) => {
    // open the AddPasswordModal in edit mode
    setDetailId(null);
    setEditItem(item);
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setEditItem(null);
  };

  return (
    // SafeAreaView from react-native-safe-area-context handles safe areas correctly
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header onOpenSettings={() => router.push("/settings")} />
      <View style={styles.content}>
        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun mot de passe pour le moment</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CategoryAccordion
                categoryId={item.id}
                categoryName={item.name}
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
        onEdit={handleEditFromDetail} // pass edit handler
      />

      {/* navigation to /settings handled by header button */}
    </SafeAreaView>
  );
};

const colors = {
  background: "#072033", // dark blue night
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
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
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
