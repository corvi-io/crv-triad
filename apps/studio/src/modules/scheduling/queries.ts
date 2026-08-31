import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  Appointment,
  AppointmentInput,
  AppointmentTransitionInput,
  CancellationReason,
  ScheduleDay,
  ScheduleDayQuery,
} from "./contracts"
import { getScheduleRange } from "./range"
import { useSchedulingRepository } from "./repository-context"

export const schedulingQueryKeys = {
  all: ["scheduling"] as const,
  day: (query: ScheduleDayQuery) => [...schedulingQueryKeys.all, "day", query] as const,
}

export function useScheduleDay(query: ScheduleDayQuery) {
  const repository = useSchedulingRepository()
  return useQuery({
    queryKey: schedulingQueryKeys.day(query),
    queryFn: () => getScheduleRange(repository, query),
  })
}

function useScheduleMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all }),
  })
}

export function useCreateAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation((input: AppointmentInput) => repository.create(input))
}

export function useUpdateAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation(({ id, input }: { id: string; input: AppointmentInput }) =>
    repository.update(id, input),
  )
}

export function useCancelAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation(
    ({ id, reason }: { id: string; reason: Exclude<CancellationReason, "no-show"> }) =>
      repository.cancel(id, reason),
  )
}

export function useTransitionAppointment() {
  const repository = useSchedulingRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AppointmentTransitionInput) => repository.transition(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: schedulingQueryKeys.all })
      const snapshots = queryClient.getQueriesData<ScheduleDay>({
        queryKey: schedulingQueryKeys.all,
      })
      for (const [key, day] of snapshots) {
        if (!day) continue
        const appointments = day.appointments.map((appointment) =>
          appointment.id === input.id
            ? {
                ...appointment,
                cancellationReason:
                  input.status === "canceled" || input.status === "no-show"
                    ? input.cancellationReason
                    : undefined,
                paymentStatus: input.paymentStatus ?? appointment.paymentStatus,
                status: input.status,
              }
            : appointment,
        )
        queryClient.setQueryData<ScheduleDay>(key, {
          ...day,
          appointments,
          occupancies: appointments
            .filter(({ status }) => status !== "canceled" && status !== "no-show")
            .map(({ date, durationMinutes, id, professionalId, start }) => ({
              date,
              durationMinutes,
              id,
              professionalId,
              start,
            })),
        })
      }
      return { snapshots }
    },
    onError: (_error, _input, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all }),
  })
}

export type AppointmentRescheduleInput = {
  appointment: Appointment
  date?: string
  professionalId: string
  start: string
}

export function applyAppointmentReschedule(
  day: ScheduleDay,
  { appointment: source, date, professionalId, start }: AppointmentRescheduleInput,
): ScheduleDay {
  const appointments = day.appointments.map((appointment) =>
    appointment.id === source.id
      ? { ...appointment, date: date ?? appointment.date, professionalId, start }
      : appointment,
  )
  return {
    ...day,
    appointments,
    occupancies: appointments
      .filter(({ status }) => status !== "canceled" && status !== "no-show")
      .map(({ date, durationMinutes, id, professionalId, start }) => ({
        date,
        durationMinutes,
        id,
        professionalId,
        start,
      })),
  }
}

export function useRescheduleAppointment() {
  const repository = useSchedulingRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ appointment, date, professionalId, start }: AppointmentRescheduleInput) =>
      repository.update(appointment.id, {
        ...appointment,
        date: date ?? appointment.date,
        professionalId,
        start,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: schedulingQueryKeys.all })
      const snapshots = queryClient.getQueriesData<ScheduleDay>({
        queryKey: schedulingQueryKeys.all,
      })
      for (const [key, day] of snapshots) {
        if (day) queryClient.setQueryData<ScheduleDay>(key, applyAppointmentReschedule(day, input))
      }
      return { snapshots }
    },
    onError: (_error, _input, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all }),
  })
}

export function useScenarioActions(query: ScheduleDayQuery) {
  const repository = useSchedulingRepository()
  const queryClient = useQueryClient()
  const refresh = (target: ScheduleDayQuery) =>
    queryClient.invalidateQueries({ exact: true, queryKey: schedulingQueryKeys.day(target) })
  return {
    reset: async () => {
      await repository.reset()
      await refresh(query)
    },
    scenarios: repository.scenarios(),
    select: async (id: string) => {
      await repository.selectScenario(id)
      await refresh({ ...query, scenarioId: id })
    },
  }
}
