import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
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
            {items.length} élément{items.length > 1 ? "s" : ""}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-down" size={20} color={styles.iconColor.color} />
        </Animated.View>
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
  title: { fontSize: 16, fontWeight: "700", color: "#e6f7ff" },
  count: { fontSize: 12, color: "#9ec5ea", marginTop: 4 },
  content: {
    paddingLeft: 16, // indentation des PasswordRow
    backgroundColor: "transparent",
  },
  iconColor: { color: "#9ec5ea" as any },
});

export default CategoryAccordion;