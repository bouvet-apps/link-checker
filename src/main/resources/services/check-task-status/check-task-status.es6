import { get as getTask } from "/lib/xp/task";

export function post(req) {
  log.info(JSON.stringify(req, null, 2));
  const body = JSON.parse(req.body);
  const { taskId } = body;

  return {
    status: 200,
    body: { ...getTask(taskId) },
    contentType: "application/json"
  };
}
