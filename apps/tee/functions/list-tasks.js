export function listTasks(tasks) {
  return tasks.filter((task) => task.status === 'active');
}
