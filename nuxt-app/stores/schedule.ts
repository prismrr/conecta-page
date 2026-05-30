import { defineStore } from "pinia";
import { scheduleData, type ScheduleSession, type SpeakerProfile } from "../data/schedule-data";

type ScheduleFilters = {
  track: string;
  period: "all" | "manha" | "tarde";
};

const sortSessionsByStartTime = (left: ScheduleSession, right: ScheduleSession) =>
  String(left.startTime || "").localeCompare(String(right.startTime || ""));

export const useScheduleStore = defineStore("schedule", {
  state: () => ({
    sessions: scheduleData.sessions as ScheduleSession[],
    speakers: scheduleData.speakers as SpeakerProfile[],
    filters: {
      track: "all",
      period: "all"
    } as ScheduleFilters
  }),
  getters: {
    tracks: (state) => {
      const seen = new Set<string>();
      const list: string[] = [];

      state.sessions
        .slice()
        .sort((a, b) => String(a.track).localeCompare(String(b.track)))
        .forEach((session) => {
          if (seen.has(session.track)) {
            return;
          }
          seen.add(session.track);
          list.push(session.track);
        });

      return list;
    },
    filteredSessions: (state) => {
      return state.sessions
        .slice()
        .sort(sortSessionsByStartTime)
        .filter((session) => {
          if (state.filters.track !== "all" && session.track !== state.filters.track) {
            return false;
          }

          if (state.filters.period !== "all" && session.period !== state.filters.period) {
            return false;
          }

          return true;
        });
    },
    summaryLabel: (state) => {
      const count = (state.sessions || [])
        .slice()
        .sort(sortSessionsByStartTime)
        .filter((session) => {
          if (state.filters.track !== "all" && session.track !== state.filters.track) {
            return false;
          }

          if (state.filters.period !== "all" && session.period !== state.filters.period) {
            return false;
          }

          return true;
        }).length;

      const parts = [count === 1 ? "1 sessao exibida" : `${count} sessoes exibidas`];

      if (state.filters.track !== "all") {
        parts.push(`trilha ${state.filters.track}`);
      }

      if (state.filters.period !== "all") {
        parts.push(`turno ${state.filters.period}`);
      }

      return parts.join(" · ");
    }
  },
  actions: {
    setTrack(track: string) {
      this.filters.track = track || "all";
    },
    setPeriod(period: "all" | "manha" | "tarde") {
      this.filters.period = period || "all";
    }
  }
});
