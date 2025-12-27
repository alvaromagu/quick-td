#!/usr/bin/env node
import {
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  text,
} from '@clack/prompts';
import { todoService } from './todo-service.js';

const today = new Date().toISOString().split('T')[0];

async function main() {
  intro('Bienvenido a quick-td');

  while (true) {
    const action = await select({
      message: '¿Qué te gustaría hacer?',
      options: [
        { value: 'view_pending', label: 'Ver Tareas Pendientes' },
        { value: 'upsert', label: 'Crear/Editar Tarea' },
        { value: 'manage', label: 'Gestionar Estados (Hecho/Pendiente)' },
        { value: 'search', label: 'Buscar Tareas Completadas' },
        { value: 'delete', label: 'Eliminar Tarea' },
        { value: 'exit', label: 'Salir' },
      ],
    });

    if (isCancel(action) || action === 'exit') break;

    switch (action) {
      case 'view_pending': {
        const pendingTodos = todoService.getPendingTodos();
        if (pendingTodos.length === 0) {
          log.warn('¡Todo al día!');
        } else {
          note(
            pendingTodos.map((t) => `⏳ ${t.task}`).join('\n'),
            'Pendientes',
          );
        }
        break;
      }

      case 'upsert': {
        const allTodos = todoService.getAllTodos();
        const selection = await select({
          message: 'Selecciona una tarea para editar o crea una nueva:',
          options: [
            {
              value: 'NEW',
              label: 'Nueva tarea',
              hint: 'Crea un nuevo registro',
            },
            ...allTodos.map((t) => ({
              value: t.id,
              label: t.task,
              hint: t.completed ? '✓ Completada' : '⏳ Pendiente',
            })),
          ],
        });

        if (isCancel(selection)) break;

        if (selection === 'NEW') {
          const name = await text({
            message: 'Descripción de la nueva tarea:',
            validate: (v) => (v.length === 0 ? 'Campo obligatorio' : undefined),
          });
          if (isCancel(name)) break;
          todoService.createTodo(name);
          log.success('Tarea añadida correctamente.');
        } else {
          const todoToEdit = allTodos.find((t) => t.id === selection);
          const newName = await text({
            message: 'Editar nombre de la tarea:',
            initialValue: todoToEdit.task,
            validate: (v) =>
              v.length === 0 ? 'No puede estar vacío' : undefined,
          });
          if (isCancel(newName)) break;
          todoService.updateTodoName(selection, newName);
          log.success('Tarea actualizada correctamente.');
        }
        break;
      }

      case 'search': {
        const dateFilter = await text({
          message: 'Introduce la fecha (AAAA-MM-DD):',
          initialValue: today,
          validate: (v) => {
            if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v))
              return 'Formato: AAAA-MM-DD';
          },
        });

        if (isCancel(dateFilter)) break;

        const results = todoService.getCompletedTodosByDate(dateFilter);
        if (results.length === 0) {
          log.warn(`No hay tareas completadas el ${dateFilter}.`);
        } else {
          const list = results
            .map((t) => `${t.completed ? '✅' : '⏳'} ${t.task}`)
            .join('\n');
          note(list, `Tareas del ${dateFilter}`);
        }
        break;
      }

      case 'manage': {
        const allTodos = todoService.getAllTodos();
        if (allTodos.length === 0) {
          log.warn('No hay tareas para gestionar.');
          break;
        }

        const selectedIds = await multiselect({
          message: 'Selecciona las tareas completadas:',
          options: allTodos.map((t) => ({
            value: t.id,
            label: t.completed ? `\x1b[9m${t.task}\x1b[29m` : t.task,
            hint: t.completed_at ? `Hecho el ${t.completed_at}` : '',
          })),
          initialValues: allTodos
            .filter((t) => t.completed === 1)
            .map((t) => t.id),
          required: false,
        });

        if (isCancel(selectedIds)) break;
        todoService.updateTodoStatuses(selectedIds, today);
        log.success('Estados actualizados.');
        break;
      }

      case 'delete': {
        const allTodos = todoService.getAllTodos();
        if (allTodos.length === 0) {
          log.warn('No hay tareas para eliminar.');
          break;
        }

        const idToDelete = await select({
          message: 'Selecciona la tarea a eliminar:',
          options: allTodos.map((t) => ({ value: t.id, label: t.task })),
        });

        if (isCancel(idToDelete)) break;

        const todo = allTodos.find((t) => t.id === idToDelete);
        const shouldDelete = await confirm({
          message: `¿Eliminar "${todo.task}"?`,
          active: 'Sí, eliminar',
          inactive: 'No, cancelar',
        });

        if (isCancel(shouldDelete) || !shouldDelete) {
          log.info('Operación cancelada.');
          break;
        }

        todoService.deleteTodo(idToDelete);
        log.error('Tarea eliminada definitivamente.');
        break;
      }
    }
  }
  outro('¡Gracias por usar quick-td!');
}

main().catch(console.error);
