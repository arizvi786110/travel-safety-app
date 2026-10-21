import { supabase } from "@/lib/auth/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const C = {
  card: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.12)",
  text: "#f4eef0",
  muted: "#b9aeb3",
};

type Suggestion = { city: string; country: string; iata_codes: string };

type Props = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

export default function CityInput({ label, value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const skipNext = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    setNoMatch(false);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/airport-cities?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } },
        );
        const data = await res.json();
        if (id !== requestId.current) return; // a newer keystroke replaced this request
        const results: Suggestion[] = res.ok ? (data.results ?? []) : [];
        setSuggestions(results);
        setNoMatch(res.ok && results.length === 0);
      } catch {
        if (id === requestId.current) setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  function pick(s: Suggestion) {
    skipNext.current = true;
    onChange(s.city);
    setSuggestions([]);
    setNoMatch(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoCorrect={false}
        style={styles.input}
      />

      {suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((s) => (
            <Pressable key={`${s.city}-${s.country}`} style={styles.item} onPress={() => pick(s)}>
              <Text style={styles.itemCity} numberOfLines={1}>
                {s.city}, {s.country}
              </Text>
              <Text style={styles.itemCodes} numberOfLines={1}>
                {s.iata_codes}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {noMatch ? (
        <Text style={styles.hint}>
          No city starting with "{value.trim()}" has flights in our data. Try the nearest big city.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { color: C.muted, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: C.text,
    fontSize: 16,
  },
  list: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 6,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  itemCity: { color: C.text, fontSize: 15, flex: 1, marginRight: 10 },
  itemCodes: { color: C.muted, fontSize: 12, maxWidth: "40%" },
  hint: { color: C.muted, fontSize: 13, marginTop: 6 },
});