import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const C = {
  card: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.12)",
  accent: "#8b5b6e",
  text: "#f4eef0",
  muted: "#b9aeb3",
  faint: "#5f575c",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  minDate: string;
  maxDate: string;
};

export default function CalendarPicker({ value, onChange, minDate, maxDate }: Props) {
  const selected = fromIso(value);
  const min = fromIso(minDate);
  const max = fromIso(maxDate);
  const [year, setYear] = useState(selected.getFullYear());
  const [month, setMonth] = useState(selected.getMonth());

  const weeks = useMemo(() => {
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // weeks start on Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const canPrev = year > min.getFullYear() || (year === min.getFullYear() && month > min.getMonth());
  const canNext = year < max.getFullYear() || (year === max.getFullYear() && month < max.getMonth());

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} disabled={!canPrev} hitSlop={10}>
          <Text style={[styles.arrow, !canPrev && styles.arrowOff]}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={() => shift(1)} disabled={!canNext} hitSlop={10}>
          <Text style={[styles.arrow, !canNext && styles.arrowOff]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((iso, j) => {
            if (!iso) return <View key={j} style={styles.cell} />;
            const disabled = iso < minDate || iso > maxDate;
            const isSelected = iso === value;
            return (
              <Pressable
                key={j}
                style={styles.cell}
                disabled={disabled}
                onPress={() => onChange(iso)}
              >
                <View style={[styles.dayBubble, isSelected && styles.dayBubbleSelected]}>
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextOff,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {Number(iso.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  arrow: { color: C.text, fontSize: 28, paddingHorizontal: 12 },
  arrowOff: { color: C.faint },
  monthTitle: { color: C.text, fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", color: C.muted, fontSize: 12, paddingVertical: 6 },
  cell: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  dayBubble: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayBubbleSelected: { backgroundColor: C.accent },
  dayText: { color: C.text, fontSize: 15 },
  dayTextOff: { color: C.faint },
  dayTextSelected: { fontWeight: "700" },
});