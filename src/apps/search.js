import { log, note, intro, outro } from '@clack/prompts';
import { todoService } from '../todo-service.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const validateDate = (val) => val && dateRegex.test(val);

export async function search(args) {
  intro('quick-td - Buscar tareas completadas');
  const date = args[0];
  printCompletedTodosByDate(date);
  outro('¡Gracias por usar quick-td!');
}

export function printCompletedTodosByDate(date) {
  if (!validateDate(date)) {
    log.error(
      'Debes introducir una fecha en formato AAAA-MM-DD para la búsqueda',
    );
  } else {
    const results = todoService.getCompletedTodosByDate(date);
    if (results.length === 0) {
      log.warn(`No hay tareas completadas el ${date}.`);
    } else {
      const list = results.map((t) => t.task).join('\n');
      note(list, `Tareas del ${date}`);
    }
  }
}
