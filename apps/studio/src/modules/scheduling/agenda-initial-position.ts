export function clampAgendaScrollTop(value: number, scrollHeight: number, clientHeight: number) {
  return Math.max(0, Math.min(value, Math.max(0, scrollHeight - clientHeight)))
}

export function resolveAgendaInitialScrollTop(input: {
  clientHeight: number
  markerTop?: number
  scrollHeight: number
  stickyHeaderHeight: number
}) {
  if (input.markerTop === undefined) return 0
  const usableHeight = Math.max(0, input.clientHeight - input.stickyHeaderHeight)
  return clampAgendaScrollTop(
    input.markerTop - input.stickyHeaderHeight - usableHeight / 2,
    input.scrollHeight,
    input.clientHeight,
  )
}
