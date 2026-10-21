import { supabase } from "@/lib/auth/supabaseClient";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! Ask me about a destination's safety, flights between cities, or managing your favourites.",
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    // The current message is sent separately, so history is everything before it
    const history = messages.slice(1).slice(-10);
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
      const data = await response.json();
      const reply = response.ok
        ? String(data.message)
        : (data.error ?? "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Couldn't reach the server. Check your connection and try again.",
        },
      ]);
    }
    setSending(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={item.role === "user" ? styles.userText : styles.botText}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          sending ? <ActivityIndicator style={styles.spinner} /> : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about a destination..."
          style={styles.input}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (sending || !input.trim()) && styles.sendDisabled,
          ]}
          onPress={send}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12, marginBottom: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#2089dc" },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#f3f4f6" },
  userText: { color: "#fff", fontSize: 15 },
  botText: { color: "#111827", fontSize: 15 },
  spinner: { alignSelf: "flex-start", margin: 8 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: "#2089dc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginLeft: 8,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600" },
});
