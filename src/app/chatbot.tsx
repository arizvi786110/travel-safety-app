import { Body, Chip, Heading, ScreenHeader } from "@/components/ui";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { colors, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = { role: "user" | "assistant"; content: string; error?: boolean };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! Ask me about a destination's safety, flights between cities, or managing your favourites.",
};

const SUGGESTIONS = [
  "Is it safe to travel to Tokyo?",
  "Flights from London to Istanbul",
  "What's the weather in Dubai?",
  "Show my favourites",
];

export default function Chatbot() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || sending) return;

    // The current message is sent separately, so history is everything before it
    // Error replies are shown to the user but never sent back to the model as history
    const history = messages
      .slice(1)
      .filter((m) => !m.error)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await response.json().catch(() => ({}));
      const reply = response.ok
        ? String(data.message ?? "I couldn't come up with an answer. Try rephrasing.")
        : response.status === 401
          ? "Your session has expired. Please sign in again."
          : typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, error: !response.ok }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Couldn't reach the server. Check your connection and try again.",
          error: true,
        },
      ]);
    }
    setSending(false);
  }

  const showSuggestions = messages.length === 1 && !sending;
  const canSend = !sending && input.trim().length > 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ImageBackground source={heroImages.assistant} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(23,21,26,0.5)", "rgba(23,21,26,0.93)"]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader />

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.titleBlock}>
              <Heading size={34}>Travel Assistant</Heading>
              <Body muted style={{ marginTop: 4 }}>
                Ask about destination safety, flights between cities, or your favourites.
              </Body>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <View style={[styles.row, isUser && styles.rowUser]}>
                {!isUser ? (
                  <View style={styles.avatar}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accentSoft} />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.botBubble,
                    item.error && styles.errorBubble,
                  ]}
                >
                  <Text style={styles.bubbleText} selectable>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            sending ? (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accentSoft} />
                </View>
                <View style={[styles.bubble, styles.botBubble, styles.thinking]}>
                  <ActivityIndicator color={colors.textMuted} size="small" />
                  <Text style={styles.thinkingText}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {showSuggestions ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onPress={() => send(s)} />
            ))}
          </View>
        ) : null}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={1000}
            />
          </View>
          <Pressable
            style={[styles.send, !canSend && { opacity: 0.4 }]}
            onPress={() => send()}
            disabled={!canSend}
          >
            <Ionicons name="arrow-up" size={20} color={colors.text} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  titleBlock: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  rowUser: { justifyContent: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  botBubble: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  userBubble: { backgroundColor: colors.accent },
  errorBubble: { borderColor: colors.danger },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8 },
  thinkingText: { color: colors.textMuted, fontSize: 14 },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: { color: colors.text, fontSize: 15, maxHeight: 120, paddingTop: 4, paddingBottom: 4 },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
}); 