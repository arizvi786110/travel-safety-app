import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SERIF = "CormorantGaramond_600SemiBold";

export type LegalSection = { heading: string; body: string[] };

export default function LegalPage({
  title, updated, intro, sections,
}: { title: string; updated: string; intro?: string; sections: LegalSection[] }) {
  const router = useRouter();
  return (
    <View style={s.root}>
      <LinearGradient colors={["#2a1f27", "#17151a"]} style={StyleSheet.absoluteFill} />
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={s.back}
          hitSlop={10}
          accessibilityRole="button" accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.updated}>Last updated {updated}</Text>
        {intro ? <Text style={s.intro}>{intro}</Text> : null}
        {sections.map((sec) => (
          <View key={sec.heading} style={s.card}>
            <Text style={s.heading}>{sec.heading}</Text>
            {sec.body.map((p, i) => (
              <Text key={i} style={s.p}>{p}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#17151a" },
  header: { paddingTop: 56, paddingHorizontal: 16 },
  back: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { color: "#fff", fontSize: 40, fontFamily: SERIF },
  updated: { color: "rgba(255,255,255,0.5)", marginTop: 4, fontSize: 13 },
  intro: { color: "rgba(255,255,255,0.75)", marginTop: 14, lineHeight: 22, fontSize: 15 },
  card: {
    marginTop: 14, padding: 18, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  heading: { color: "#e8c9d2", fontSize: 22, fontFamily: SERIF, marginBottom: 8 },
  p: { color: "rgba(255,255,255,0.78)", lineHeight: 22, fontSize: 14.5, marginBottom: 8 },
});