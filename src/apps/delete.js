import { log, select, confirm, isCancel } from '@clack/prompts';
import { todoService } from '../todo-service.js';

export async function deleteApp(args) {
  args = args ?? [];
  const searchIndex = args.findIndex(
    (arg) => arg === '--filter' || arg === '-f',
  );
  const search = args[searchIndex + 1];
  await deleteTodoWithSearch(search);
}

export async function deleteTodoWithSearch(search) {
  const todos = todoService.getTodos({ search });
  if (todos.length <= 0) {
    log.warn('No se han encontrado tareas para eliminar');
    return;
  }
  const idToDelete =
    todos.length === 1 &&
    search?.trim()?.toLowerCase() === todos[0].task.trim().toLowerCase()
      ? todos[0].id
      : await select({
          message: 'Selecciona la tarea a eliminar:',
          options: todos.map((t) => ({
            value: t.id,
            label: t.completed ? `\x1b[9m${t.task}\x1b[29m` : t.task,
            hint: t.completed ? 'Completada' : 'Pendiente',
          })),
        });
  if (isCancel(idToDelete)) {
    return;
  }
  const todo = todos.find((t) => t.id === idToDelete);
  const shouldDelete = await confirm({
    message: `¿Eliminar "${todo.task}"?`,
    active: 'Sí, eliminar',
    inactive: 'No, cancelar',
  });
  if (isCancel(shouldDelete) || !shouldDelete) {
    log.info('Operación cancelada.');
    return;
  }
  todoService.deleteTodo(idToDelete);
  log.error('Tarea eliminada definitivamente.');
}
