export function draftKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Approve", callback_data: `draft:approve:${draftId}` },
        { text: "Reject", callback_data: `draft:reject:${draftId}` },
      ],
      [
        { text: "Schedule", callback_data: `draft:schedule_options:${draftId}` },
        { text: "Rewrite shorter", callback_data: `draft:rewrite_shorter:${draftId}` },
        { text: "Rewrite sharper", callback_data: `draft:rewrite_sharper:${draftId}` },
      ],
      [
        { text: "Rewrite more like me", callback_data: `draft:rewrite_personal:${draftId}` },
      ],
    ],
  };
}

export function scheduleKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Tomorrow 09:00", callback_data: `draft:schedule_tomorrow_0900:${draftId}` },
        { text: "Tomorrow 14:00", callback_data: `draft:schedule_tomorrow_1400:${draftId}` },
      ],
      [{ text: "Back to actions", callback_data: `draft:show_actions:${draftId}` }],
    ],
  };
}
