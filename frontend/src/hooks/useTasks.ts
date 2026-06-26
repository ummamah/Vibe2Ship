import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskService, CreateTaskPayload } from '../services/taskService'

export function useTasks() {
  const queryClient = useQueryClient()

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
  })

  const prioritizedQuery = useQuery({
    queryKey: ['tasks', 'prioritized'],
    queryFn: taskService.getPrioritizedTasks,
  })

  const createMutation = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'prioritized'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'prioritized'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      taskService.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'prioritized'] })
    },
  })

  return {
    tasks: tasksQuery.data?.tasks || [],
    prioritizedTasks: prioritizedQuery.data?.tasks || [],
    isLoading: tasksQuery.isLoading || prioritizedQuery.isLoading,
    isError: tasksQuery.isError || prioritizedQuery.isError,
    createTask: createMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    updateTaskStatus: updateStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  }
}
