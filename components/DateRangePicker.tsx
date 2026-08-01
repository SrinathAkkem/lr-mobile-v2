import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { CalendarIcon, ChevronBackIcon, ChevronDownIcon, CloseIcon, CalendarOutlineIcon, IonCloseIcon } from "./icons";
import { COLORS, BORDER_RADIUS, SPACING } from "../constants/theme";
import { FONTS } from "../constants/fonts";

export type DateRange = {
  start: Date;
  end: Date;
};

type DateRangePickerProps = {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  variant?: "default" | "figma";
};

type DropdownKind = "month" | "year" | null;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBetween(date: Date, start: Date, end: Date) {
  const time = startOfDay(date).getTime();
  const startTime = startOfDay(start).getTime();
  const endTime = startOfDay(end).getTime();
  const min = Math.min(startTime, endTime);
  const max = Math.max(startTime, endTime);
  return time > min && time < max;
}

function formatRangeLabel(range: DateRange, variant: "default" | "figma" = "default") {
  const format = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;
  return `${format(range.start)} - ${format(range.end)}`;
}

function buildCalendarCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const gridStart = new Date(year, monthIndex, 1 - firstDay.getDay());
  const cells: Date[] = [];

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    cells.push(day);
  }

  return cells;
}

function isSameMonth(date: Date, month: Date) {
  return (
    date.getMonth() === month.getMonth() &&
    date.getFullYear() === month.getFullYear()
  );
}

export function formatDateRangeLabel(range: DateRange | null) {
  return range ? formatRangeLabel(range) : null;
}

export function DateRangePicker({
  value,
  onChange,
  variant = "default",
}: DateRangePickerProps) {
  const [visible, setVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value?.start ?? new Date());
  const [draftStart, setDraftStart] = useState<Date | null>(value?.start ?? null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(value?.end ?? null);
  const [dropdown, setDropdown] = useState<DropdownKind>(null);

  const monthDays = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const yearOptions = useMemo(() => {
    const current = visibleMonth.getFullYear();
    return Array.from({ length: 12 }, (_, i) => current - 5 + i);
  }, [visibleMonth]);

  const openPicker = () => {
    setVisibleMonth(value?.start ?? new Date());
    setDraftStart(value?.start ?? null);
    setDraftEnd(value?.end ?? null);
    setDropdown(null);
    setVisible(true);
  };

  const closePicker = () => {
    setDropdown(null);
    setVisible(false);
  };

  const applyRange = (start: Date, end: Date) => {
    const normalizedStart = startOfDay(start);
    const normalizedEnd = startOfDay(end);
    onChange(
      normalizedStart <= normalizedEnd
        ? { start: normalizedStart, end: normalizedEnd }
        : { start: normalizedEnd, end: normalizedStart }
    );
    closePicker();
  };

  const handleDayPress = (day: Date) => {
    if (!isSameMonth(day, visibleMonth)) {
      setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day);
      setDraftEnd(null);
      return;
    }

    if (isSameDay(day, draftStart)) {
      applyRange(day, day);
      return;
    }

    if (day < draftStart) {
      applyRange(day, draftStart);
      return;
    }

    applyRange(draftStart, day);
  };

  const shiftMonth = (delta: number) => {
    setDropdown(null);
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1)
    );
  };

  const monthLabel = MONTHS[visibleMonth.getMonth()];
  const yearLabel = visibleMonth.getFullYear().toString();
  const isFigma = variant === "figma";

  const trigger = value ? (
    <View style={[styles.selectedButton, isFigma && styles.figmaButton]}>
      <Pressable style={styles.figmaContent} onPress={openPicker}>
        {isFigma ? <CalendarIcon size={16} color="#FFFFFF" /> : null}
        <Text
          style={[styles.selectedText, isFigma && styles.figmaText]}
          numberOfLines={1}
        >
          {formatRangeLabel(value, variant)}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(null)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isFigma ? (
          <CloseIcon size={10} color="#FFFFFF" />
        ) : (
          <IonCloseIcon size={14} color="#FFFFFF" />
        )}
      </Pressable>
    </View>
  ) : (
    <Pressable
      style={[styles.selectButton, isFigma && styles.figmaButton]}
      onPress={openPicker}
    >
      {isFigma ? (
        <CalendarIcon size={16} color="#FFFFFF" />
      ) : (
        <CalendarOutlineIcon size={14} color="#FFFFFF" />
      )}
      <Text
        style={[styles.selectText, isFigma && styles.figmaText]}
        numberOfLines={1}
      >
        Select Date Range
      </Text>
    </Pressable>
  );

  return (
    <>
      {isFigma ? <View style={styles.figmaWrap}>{trigger}</View> : trigger}

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={closePicker}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
                <ChevronBackIcon size={20} color="#141414" />
              </Pressable>

              <View style={styles.headerCenter}>
                <Pressable
                  style={styles.selectorPill}
                  onPress={() => setDropdown(dropdown === "month" ? null : "month")}
                >
                  <Text style={styles.selectorText}>{monthLabel}</Text>
                  <ChevronDownIcon size={10} color="#141414" />
                </Pressable>
                <Pressable
                  style={styles.selectorPill}
                  onPress={() => setDropdown(dropdown === "year" ? null : "year")}
                >
                  <Text style={styles.selectorText}>{yearLabel}</Text>
                  <ChevronDownIcon size={10} color="#141414" />
                </Pressable>
              </View>

              <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.chevronForward}>
                <ChevronBackIcon size={20} color="#141414" />
              </Pressable>
            </View>

            {dropdown === "month" ? (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {MONTHS.map((month, index) => (
                    <Pressable
                      key={month}
                      style={[
                        styles.dropdownItem,
                        index === visibleMonth.getMonth() && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setVisibleMonth(new Date(visibleMonth.getFullYear(), index, 1));
                        setDropdown(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          index === visibleMonth.getMonth() && styles.dropdownItemTextActive,
                        ]}
                      >
                        {month}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {dropdown === "year" ? (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {yearOptions.map((year) => (
                    <Pressable
                      key={year}
                      style={[
                        styles.dropdownItem,
                        year === visibleMonth.getFullYear() && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                        setDropdown(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          year === visibleMonth.getFullYear() && styles.dropdownItemTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {monthDays.map((day) => {
                const outsideMonth = !isSameMonth(day, visibleMonth);
                const rangeStart =
                  draftStart && draftEnd
                    ? startOfDay(draftStart) <= startOfDay(draftEnd)
                      ? draftStart
                      : draftEnd
                    : null;
                const rangeEnd =
                  draftStart && draftEnd
                    ? startOfDay(draftStart) <= startOfDay(draftEnd)
                      ? draftEnd
                      : draftStart
                    : null;

                const isRangeStart = rangeStart ? isSameDay(day, rangeStart) : false;
                const isRangeEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                const inRangeMiddle =
                  rangeStart && rangeEnd
                    ? isBetween(day, rangeStart, rangeEnd)
                    : false;
                const isPendingStart =
                  draftStart && !draftEnd && isSameDay(day, draftStart);

                return (
                  <Pressable
                    key={day.toISOString()}
                    style={[
                      styles.dayCell,
                      (inRangeMiddle || isRangeStart || isRangeEnd) && styles.dayCellInRange,
                      isRangeStart && styles.dayCellRangeStart,
                      isRangeEnd && styles.dayCellRangeEnd,
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        (isRangeStart || isRangeEnd || isPendingStart) && styles.dayEndpoint,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          outsideMonth && styles.dayTextOutside,
                          (isRangeStart || isRangeEnd || isPendingStart) && styles.dayTextSelected,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  selectText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "500",
  },
  selectedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    gap: 8,
  },
  selectedText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "500",
  },
  figmaWrap: {
    width: "100%",
    alignSelf: "stretch",
  },
  figmaButton: {
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  figmaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  figmaText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.white,
    flexShrink: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  selectorText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#141414",
  },
  chevronForward: {
    transform: [{ scaleX: -1 }],
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    maxHeight: 180,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: "#F2F2F2",
  },
  dropdownItemText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#141414",
  },
  dropdownItemTextActive: {
    fontFamily: FONTS.semiBold,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#757575",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellInRange: {
    backgroundColor: "#F2F2F2",
  },
  dayCellRangeStart: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  dayCellRangeEnd: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayEndpoint: {
    backgroundColor: "#212121",
  },
  dayText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#141414",
  },
  dayTextOutside: {
    color: "#BDBDBD",
  },
  dayTextSelected: {
    fontFamily: FONTS.semiBold,
    color: "#FFFFFF",
  },
});
