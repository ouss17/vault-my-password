import { addCategory, deleteCategoryAndPasswords, upsertCategory } from "@/redux/slices/categoriesSlice";
import { upsertPassword } from "@/redux/slices/pwdSlice";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import PasswordRow from "./PasswordRow";

type PasswordItem = {
  id: string;
  name: string;
  username?: string; 
  isOld?: boolean;
};

const CategoryAccordion = ({
  categoryId,
  categoryName,
  items,
  onReveal,
}: {
  categoryId: string;
  categoryName: string;
  items: PasswordItem[];
  onReveal: (id: string) => void;
}) => {
  const dispatch = useDispatch();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); 
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState<string>(categoryName);
 
  const progress = useRef(new Animated.Value(0)).current; 
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "android") {
    }
  }, []);

  const toggle = () => {
    if (!open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
      setOpen(true);
    } else {
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setOpen(false);
        setMounted(false);
      });
    }
  };

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const contentStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  };

  const onDeleteCategory = () => {
    if (categoryId === "uncategorized") {
      Alert.alert(t("alerts.deleteCategory.forbiddenTitle"), t("alerts.deleteCategory.forbiddenMessage"));
      return;
    }

    const confirmTitle = t("alerts.deleteCategory.confirmTitle");
    const confirmMsgTemplate = t("alerts.deleteCategory.confirmMessage");
    const confirmMsg = confirmMsgTemplate.replace("{name}", categoryName).replace("{count}", String(items.length));

    Alert.alert(
      confirmTitle,
      confirmMsg,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const res = await (dispatch as any)(deleteCategoryAndPasswords(categoryId));
              const payload = res?.payload ?? { removedCategory: null, removedPasswords: [] };

              const deletedTitle = t("alerts.deleteCategory.deletedTitle");
              const deletedMsg = t("alerts.deleteCategory.deletedMessage").replace("{name}", categoryName);

              Alert.alert(
                deletedTitle,
                deletedMsg,
                [
                  {
                    text: t("alerts.deleteCategory.undo"),
                    onPress: () => {
                      
                      if (payload.removedCategory) {
                        dispatch(addCategory(payload.removedCategory));
                      }
                      if (Array.isArray(payload.removedPasswords)) {
                        payload.removedPasswords.forEach((p: any) => dispatch(upsertPassword(p)));
                      }
                    },
                  },
                  { text: t("common.ok"), style: "default" },
                ],
                { cancelable: true }
              );
            } catch (err) {
              console.error("Delete category error:", err);
              Alert.alert(t("alert.error.title"), t("alerts.deleteCategory.errorMessage"));
            }
          },
        },
      ],
    );
  };

  const startEdit = () => {
    setEditName(categoryName);
    setEditing(true);
    // ensure input visible on small screens
    setTimeout(() => Keyboard.dismiss(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(categoryName);
  };

  const saveEdit = () => {
    const name = (editName ?? "").toString().trim();
    if (!name) {
      Alert.alert(t("alert.error.title"), t("validation.requiredFields"));
      return;
    }
    try {
      dispatch(upsertCategory({ id: categoryId, name, updatedAt: Date.now() } as any));
      setEditing(false);
    } catch (err) {
      console.error("Update category error:", err);
      Alert.alert(t("alert.error.title"), t("alerts.updateCategory.errorMessage") ?? t("alert.error.generic"));
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        android_ripple={{ color: "rgba(255,255,255,0.03)" }}
      >
        <View style={styles.headerLeft}>
          {editing ? (
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.editInput}
                placeholder={t("category.editPlaceholder") ?? ""}
                placeholderTextColor={"#9ec5ea"}
                numberOfLines={1}
                maxLength={20}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  saveEdit();
                  Keyboard.dismiss();
                }}
              />
              <Text style={[styles.charCount, editName.length >= 20 ? styles.charCountWarning : null]}>
                {editName.length}/20
              </Text>
            </View>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {categoryName}
            </Text>
          )}
          <Text style={styles.count}>
            {items.length} {items.length > 1 ? t("category.count.plural") : t("category.count.singular")}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {editing ? (
            <>
              <TouchableOpacity onPress={saveEdit} style={styles.iconBtn} accessibilityLabel={t("actions.save")}>
                <Ionicons name="checkmark" size={22} color="#9ec5ea" />
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} style={styles.iconBtn} accessibilityLabel={t("common.cancel")}>
                <Ionicons name="close" size={22} color="#9ec5ea" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => startEdit()}
                style={styles.iconBtn}
                android_ripple={{ color: "rgba(255,255,255,0.04)", radius: 20 }}
                accessibilityLabel={`${t("accessibility.editCategory")} ${categoryName}`}
              >
                <Ionicons name="pencil-outline" size={22} color="#9ec5ea" />
              </Pressable>

              <Pressable
                onPress={onDeleteCategory}
                style={styles.iconBtn}
                android_ripple={{ color: "rgba(255,255,255,0.04)", radius: 20 }}
                accessibilityLabel={`${t("accessibility.deleteCategory")} ${categoryName}`}
              >
                <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
              </Pressable>
            </>
          )}

          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="chevron-down" size={24} color={styles.iconColor.color} />
          </Animated.View>
        </View>
      </Pressable>

      {mounted && (
        <Animated.View style={[styles.content, contentStyle]}>
          {items.map((it) => (
            <PasswordRow
              key={it.id}
              id={it.id}
              name={it.name}
              username={it.username}
              isOld={it.isOld}
              onReveal={() => onReveal(it.id)}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.03)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  headerLeft: { maxWidth: "85%" },
  editInput: {
    borderWidth: 1,
    borderColor: "rgba(158,197,234,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    color: "#e6f7ff",
    minWidth: 80,
    flex: 1,
    marginRight: 8,
  },
  charCount: { color: "#9ec5ea", fontSize: 12, marginLeft: 8 },
  charCountWarning: { color: "#ff6b6b" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 8, borderRadius: 20, minWidth: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#e6f7ff" },
  count: { fontSize: 12, color: "#9ec5ea", marginTop: 4 },
  content: {
    paddingLeft: 16,
    backgroundColor: "transparent",
  },
  iconColor: { color: "#9ec5ea" as any },
});

export default CategoryAccordion;