import { addCategory, deleteCategoryAndPasswords } from "@/redux/slices/categoriesSlice";
import { upsertPassword } from "@/redux/slices/pwdSlice";
import { useT } from "@/utils/useText";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import PasswordRow from "./PasswordRow";

type PasswordItem = {
  id: string;
  name: string;
  username?: string; // added optional username
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
  const [mounted, setMounted] = useState(false); // controls rendering of content for animated unmount

  const progress = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ensure smooth behavior on Android if needed (kept minimal)
    if (Platform.OS === "android") {
      // no-op placeholder — kept in case you want LayoutAnimation elsewhere
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
    const confirmMsgTemplate = t("alerts.deleteCategory.confirmMessage"); // expects {name} and {count}
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
              // dispatch thunk that removes category and related passwords and returns the removed data
              const res = await (dispatch as any)(deleteCategoryAndPasswords(categoryId));
              const payload = res?.payload ?? { removedCategory: null, removedPasswords: [] };

              // show undo alert: user can restore removed data
              const deletedTitle = t("alerts.deleteCategory.deletedTitle");
              const deletedMsg = t("alerts.deleteCategory.deletedMessage").replace("{name}", categoryName);

              Alert.alert(
                deletedTitle,
                deletedMsg,
                [
                  {
                    text: t("alerts.deleteCategory.undo"),
                    onPress: () => {
                      // restore category and passwords (use addCategory / upsertPassword to keep original ids)
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

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        android_ripple={{ color: "rgba(255,255,255,0.03)" }}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.count}>
            {items.length} {items.length > 1 ? t("category.count.plural") : t("category.count.singular")}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={onDeleteCategory}
            style={styles.iconBtn}
            android_ripple={{ color: "rgba(255,255,255,0.04)", radius: 20 }}
            accessibilityLabel={`${t("accessibility.deleteCategory")} ${categoryName}`}
          >
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </Pressable>

          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="chevron-down" size={20} color={styles.iconColor.color} />
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
              username={it.username} // pass username when present
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 6, borderRadius: 20 },
  title: { fontSize: 16, fontWeight: "700", color: "#e6f7ff" },
  count: { fontSize: 12, color: "#9ec5ea", marginTop: 4 },
  content: {
    paddingLeft: 16, // indentation des PasswordRow
    backgroundColor: "transparent",
  },
  iconColor: { color: "#9ec5ea" as any },
});

export default CategoryAccordion;