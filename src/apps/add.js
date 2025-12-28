import { intro, log, outro } from '@clack/prompts';
import { todoService } from '../todo-service.js';

export function validateName(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

export async function add(args) {
  intro('quick-td - Ver tareas pendientes');
  const name = args.join(' ');
  addTodo(name);
  outro('¡Gracias por usar quick-td!');
}

export function addTodo(name) {
  if (!validateName(name)) {
    log.error('Es obligatorio indicar un nombre para la tarea');
  } else {
    todoService.createTodo(name);
    log.success(`Tarea {${name}} añadida correctamente.`);
  }
}
