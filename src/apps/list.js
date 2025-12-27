import { log, note } from '@clack/prompts';
import { todoService } from '../todo-service.js';
import { intro } from '@clack/prompts';
import { outro } from '@clack/prompts';

export async function list() {
  intro('quick-td - Ver tareas pendientes');
  printPendingTodos();
  outro('¡Gracias por usar quick-td!');
}

export function printPendingTodos() {
  const pendingTodos = todoService.getPendingTodos();
  if (pendingTodos.length === 0) {
    log.warn('¡Todo al día!');
  } else {
    note(pendingTodos.map((t) => t.task).join('\n'), 'Tareas pendientes');
  }
}
