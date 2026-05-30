import { describe, test, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ScheduleTimeline from "../../../nuxt-app/components/schedule/ScheduleTimeline.vue";

describe("nuxt schedule timeline component", () => {
  test("should render timeline sessions with anchors", () => {
    const wrapper = mount(ScheduleTimeline, {
      props: {
        sessions: [
          {
            id: "sess-1",
            startTime: "09:00",
            endTime: "09:40",
            title: "Abertura",
            summary: "Resumo",
            track: "Governanca e Impacto",
            period: "manha",
            format: "keynote",
            room: "Palco"
          }
        ]
      }
    });

    expect(wrapper.find("[data-schedule-list]").exists()).toBe(true);
    expect(wrapper.find(".timeline-item").text()).toContain("09:00 - 09:40");
    expect(wrapper.find("[data-session-id='sess-1']").exists()).toBe(true);
  });

  test("should render empty message when no sessions", () => {
    const wrapper = mount(ScheduleTimeline, {
      props: {
        sessions: []
      }
    });

    expect(wrapper.text()).toContain("Nenhuma sessao encontrada");
  });
});
