import { submitTask, isRunning } from "/lib/xp/task";
import { run as runInContext } from "/lib/xp/context";
import { get as getContent } from "/lib/xp/content";
import { checkNode } from "/lib/checker";
import { getResultRepoConnection } from "/lib/utils";
import { enrichLink } from "../result/result";

const descriptor = `${app.name}:check-sites`;

export function post(req) {
  const body = JSON.parse(req.body);
  const { nodePath } = body;
  if (nodePath) return singleCheck(body);

  if (isRunning(descriptor)) {
    return {
      status: 409,
      body: {
        message: "Task is already running"
      },
      contentType: "application/json"
    };
  }

  const newTaskId = submitTask({
    descriptor,
    name: "Check sites - Manuel trigger"
  });

  if (newTaskId) {
    return {
      status: 200,
      body: {
        taskId: newTaskId
      },
      contentType: "application/json"
    };
  }

  return {
    status: 500,
    body: {
      message: "Failed to start task"
    },
    contentType: "application/json"
  };
}

function singleCheck(body) {
  const { repo, branch, nodePath } = body;
  return runInContext({
    repository: repo,
    branch,
    principals: ["role:system.admin", "role:cms.expert", "role:cms.admin"]
  }, () => {
    const node = getContent({ key: nodePath });
    if (!node) {
      return {
        status: 404,
        body: {
          message: "Content not found"
        },
        contentType: "application/json"
      };
    }

    const checkResult = checkNode(node, true);
    if (!checkResult) {
      return removeFromReport(body);
    }
    const { result } = checkNode(node, true);
    result.brokenLinks = [].concat(result.brokenLinks).map((link) => enrichLink(link, node));

    return {
      status: 200,
      body: result,
      contentType: "application/json"
    };
  });
}

function removeFromReport(body) {
  const {
    repo, branch, nodePath, site
  } = body;
  const linkRepo = getResultRepoConnection();
  const report = linkRepo.get(`/${repo}__${site.name}__${branch}`);
  const { data } = report;
  const newResults = data.results.filter((result) => result.path !== nodePath);
  if (newResults.length === 0) {
    const deleteRes = linkRepo.delete(report._id);
    if (deleteRes.length > 0) {
      return {
        status: 200,
        body: {
          message: "Report deleted",
          type: "report_delete"
        },
        contentType: "application/json"
      };
    }
  }
  const modifyResult = linkRepo.modify({
    key: report._id,
    editor: (node) => {
      node.data.results = newResults;
      return node;
    }
  });
  if (modifyResult) {
    return {
      status: 200,
      body: {
        message: "Node removed from report",
        type: "node_remove"
      },
      contentType: "application/json"
    };
  }

  return {
    status: 500,
    body: {
      type: "error",
      message: "Failed to modify"
    },
    contentType: "application/json"
  };
}
