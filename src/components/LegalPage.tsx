import { ScrollView, StyleSheet, Text, View } from "react-native";

export type LegalSection = { heading: string; body: string };

export default function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.updated}>Last updated: {updated}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: "700" },
  updated: { color: "#6b7280", fontSize: 13, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 20 },
  heading: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22, color: "#374151" },
});
