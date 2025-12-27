#!/usr/bin/env node
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import {
  intro,
  log,
  outro,
  select,
  text,
  note,
  isCancel,
  multiselect,
  confirm,
} from "@clack/prompts";

// Configuración de la ruta persistente
const dir = join(homedir(), ".quick-td");
mkdirSync(dir, { recursive: true });
const dbName = process.env.DB_NAME ?? "todos.db";
const dbPath = join(dir, dbName);

const db = new DatabaseSync(dbPath);
const today = new Date().toISOString().split("T")[0];

// --- SISTEMA DE MIGRACIONES ---
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT NULL
  )
`);

async function main() {
  intro("Bienvenido a quick-td");

  while (true) {
    const action = await select({
      message: "¿Qué te gustaría hacer?",
      options: [
        { value: "view_pending", label: "Ver Tareas Pendientes" },
        { value: "upsert", label: "Crear/Editar Tarea" },
        { value: "manage", label: "Gestionar Estados (Hecho/Pendiente)" },
        { value: "search", label: "Buscar Tareas Completadas" }, // Etiqueta actualizada
        { value: "delete", label: "Eliminar Tarea" },
        { value: "exit", label: "Salir" },
      ],
    });

    if (isCancel(action) || action === "exit") break;

    switch (action) {
      case "view_pending":
        const pending = db
          .prepare("SELECT * FROM tasks WHERE completed = 0")
          .all();
        if (pending.length === 0) {
          log.warn("¡Todo al día!");
        } else {
          note(pending.map((t) => `⏳ ${t.task}`).join("\n"), "Pendientes");
        }
        break;

      case "upsert":
        const allTasks = db.prepare("SELECT * FROM tasks").all();
        const upsertOptions = [
          {
            value: "NEW",
            label: "Nueva tarea",
            hint: "Crea un nuevo registro",
          },
          ...allTasks.map((t) => ({
            value: t.id,
            label: t.task,
            hint: t.completed ? "✓ Completada" : "⏳ Pendiente",
          })),
        ];

        const selection = await select({
          message: "Selecciona una tarea para editar o crea una nueva:",
          options: upsertOptions,
        });

        if (isCancel(selection)) break;

        if (selection === "NEW") {
          const n = await text({
            message: "Descripción de la nueva tarea:",
            validate: (v) => (v.length === 0 ? "Campo obligatorio" : undefined),
          });
          if (isCancel(n)) break;
          db.prepare("INSERT INTO tasks (task) VALUES (?)").run(n);
          log.success("Tarea añadida correctamente.");
        } else {
          const taskToEdit = allTasks.find((t) => t.id === selection);
          const newName = await text({
            message: "Editar nombre de la tarea:",
            initialValue: taskToEdit.task,
            validate: (v) =>
              v.length === 0 ? "El nombre no puede estar vacío" : undefined,
          });
          if (isCancel(newName)) break;
          db.prepare("UPDATE tasks SET task = ? WHERE id = ?").run(
            newName,
            selection,
          );
          log.success("Tarea actualizada correctamente.");
        }
        break;

      case "search":
        const dateFilter = await text({
          message: "Introduce la fecha de completado (AAAA-MM-DD):",
          initialValue: today,
          placeholder: today,
          validate: (v) => {
            if (!v) return "La fecha es obligatoria para buscar";
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
              return "Formato requerido: AAAA-MM-DD";
          },
        });

        if (isCancel(dateFilter)) break;

        // Búsqueda simplificada: solo por fecha de completado
        const results = db
          .prepare("SELECT * FROM tasks WHERE completed_at = ?")
          .all(dateFilter);

        if (results.length === 0) {
          log.warn(`No hay tareas completadas el ${dateFilter}.`);
        } else {
          const list = results
            .map((t) => {
              const icon = t.completed ? "✅" : "⏳";
              return `${icon} ${t.task}`;
            })
            .join("\n");
          note(list, `Tareas del ${dateFilter}`);
        }
        break;

      case "manage":
        const allM = db.prepare("SELECT * FROM tasks").all();
        if (allM.length === 0) {
          log.warn("No hay tareas para gestionar.");
          break;
        }

        const sIds = await multiselect({
          message:
            "Selecciona las tareas que están completadas (Espacio para marcar):",
          options: allM.map((t) => ({
            value: t.id,
            label: t.completed ? `\x1b[9m${t.task}\x1b[29m` : t.task,
            hint: t.completed_at ? `Hecho el ${t.completed_at}` : "",
          })),
          initialValues: allM.filter((t) => t.completed === 1).map((t) => t.id),
          required: false,
        });
        if (isCancel(sIds)) break;

        db.exec("BEGIN TRANSACTION");
        db.prepare("UPDATE tasks SET completed = 0, completed_at = NULL").run();
        const up = db.prepare(
          "UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?",
        );
        for (const id of sIds) up.run(today, id);
        db.exec("COMMIT");
        log.success("Estados actualizados.");
        break;

      case "delete":
        const allD = db.prepare("SELECT * FROM tasks").all();
        if (allD.length === 0) {
          log.warn("No hay tareas para eliminar.");
          break;
        }

        const idD = await select({
          message: "Selecciona la tarea a eliminar:",
          options: allD.map((t) => ({ value: t.id, label: t.task })),
        });

        if (isCancel(idD)) break;

        // --- NUEVA LÓGICA DE CONFIRMACIÓN ---
        const taskToDelete = allD.find((t) => t.id === idD);
        const shouldDelete = await confirm({
          message: `¿Estás seguro de que quieres eliminar la tarea: "${taskToDelete.task}"?`,
          active: "Sí, eliminar",
          inactive: "No, cancelar",
        });

        if (isCancel(shouldDelete) || !shouldDelete) {
          log.info("Operación cancelada.");
          break;
        }

        db.prepare("DELETE FROM tasks WHERE id = ?").run(idD);
        log.error("Tarea eliminada definitivamente.");
        break;
    }
  }
  outro("¡Gracias por usar quick-td!");
}

main().catch(console.error);
