const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { transformSync } = require("@babel/core");

function loadModule(path, mocks, globals = {}) {
  const filename = resolve("src/main/resources", path);
  const { code } = transformSync(readFileSync(filename, "utf8"), { filename });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in mocks, `Unexpected import: ${name}`);
      return mocks[name];
    },
    app: { name: "no.bouvet.app.linkchecker", config: {}, version: "3.3.0" },
    ...globals
  });
  return exports;
}

test("URL extraction preserves non-ASCII path and query endings", () => {
  const checker = loadModule("lib/checker.es6", {
    "/lib/xp/content": {},
    "/lib/xp/node": {},
    "/lib/xp/context": {},
    "/lib/http-client": {}
  });
  const urls = [
    "https://example.com/sti/\u00e6",
    "https://example.com/?q=\u00e6",
    "https://example.com/\uD83D\uDE00"
  ];
  assert.deepEqual(Array.from(checker.getExternalLinks(JSON.stringify({ urls }))), urls);
});

test("Unicode URL extraction keeps surrounding quotes, whitespace and punctuation out", () => {
  const checker = loadModule("lib/checker.es6", {
    "/lib/xp/content": {},
    "/lib/xp/node": {},
    "/lib/xp/context": {},
    "/lib/http-client": {}
  });
  const url = "https://example.com/\u00e6";
  for (const text of [
    `\u00ab${url}\u00bb `,
    `\u201c${url}\u201d `,
    `${url}\u00a0next`,
    `${url}. `
  ]) {
    assert.deepEqual(Array.from(checker.getExternalLinks(text)), [url]);
  }
});

for (const state of ["WAITING", "RUNNING"]) {
  test(`reload recovers a ${state} task and its ID`, () => {
    const controller = loadModule("admin/tools/link-checker/link-checker.es6", {
      "/lib/thymeleaf": { render: (_, model) => model.props },
      "/lib/xp/portal": { serviceUrl: ({ service }) => service },
      "/lib/xp/i18n": { getPhrases: () => ({}) },
      "/lib/xp/task": {
        list: () => [{ id: "task-id", state }]
      },
      "/lib/utils": { getResultRepoConnection: () => ({ query: () => ({ hits: [] }) }) },
      "/lib/browsersync": {}
    }, { resolve: (path) => path });
    const props = JSON.parse(controller.get({}).body);
    assert.equal(props.inProgress, true);
    assert.equal(props.runningTaskId, "task-id");
  });

  test(`duplicate check is rejected while ${state}`, () => {
    const trigger = loadModule("services/trigger/trigger.es6", {
      "/lib/xp/task": {
        list: () => [{ state }],
        submitTask: () => assert.fail("Must not start a duplicate")
      },
      "/lib/xp/context": {},
      "/lib/xp/content": {},
      "/lib/checker": {},
      "/lib/utils": {},
      "../result/result": { clearCache() {} }
    });
    assert.equal(trigger.post({}).status, 409);
  });
}

test("manual checks use the discoverable default task name", () => {
  let submitted;
  const trigger = loadModule("services/trigger/trigger.es6", {
    "/lib/xp/task": {
      list: () => [],
      submitTask: (params) => { submitted = params; return "new-task"; }
    },
    "/lib/xp/context": {},
    "/lib/xp/content": {},
    "/lib/checker": {},
    "/lib/utils": {},
    "../result/result": { clearCache() {} }
  });
  assert.equal(trigger.post({}).body.taskId, "new-task");
  assert.equal(submitted.descriptor, "no.bouvet.app.linkchecker:check-sites");
  assert.equal(submitted.name, undefined);
});

test("checks more than 10000 items and invalidates each saved site's cache", () => {
  const ids = Array.from({ length: 10021 }, (_, index) => ({ id: String(index) }));
  let checked = 0;
  const savedCounts = [];
  const invalidatedCounts = [];
  const progress = [];
  const task = loadModule("tasks/check-sites/check-sites.es6", {
    "/lib/xp/content": { get: ({ key }) => ({ _id: key }), getSiteConfig: () => ({}) },
    "/lib/xp/node": {
      connect: () => ({
        query(params) {
          assert.equal(params.count, -1);
          assert.equal(params.start, undefined);
          return { hits: ids };
        }
      })
    },
    "/lib/xp/repo": { list: () => [{ id: "com.enonic.cms.test" }] },
    "/lib/xp/context": { run: (_, callback) => callback() },
    "/lib/xp/auth": {},
    "/lib/xp/task": { progress: (value) => progress.push(value) },
    "/lib/utils": {
      getSites: () => [{ _id: "site", _path: "/site", _name: "site" }],
      saveResults: (results) => savedCounts.push(results.length)
    },
    "/lib/checker": {
      checkNode(node) {
        checked++;
        return { result: node };
      }
    },
    "/services/result/result": {
      clearCache: () => invalidatedCounts.push(savedCounts.length)
    }
  });
  task.run();
  assert.equal(checked, 20042); // Draft and master.
  assert.deepEqual(savedCounts, [10021, 10021]);
  assert.deepEqual(invalidatedCounts, [1, 2, 2]);
  assert.equal(progress.at(-1).current, 10021);
  assert.equal(progress.at(-1).total, 10021);
});

for (const singleton of [true, false]) {
  test(`reports include ${singleton ? "a singleton" : "an array of"} affected content`, () => {
    const node = {
      path: "/test/page",
      brokenLinks: { link: "http://example.test/missing", status: 404 }
    };
    const data = {
      repoId: "com.enonic.cms.test",
      branch: "draft",
      site: { id: "site", name: "test" },
      results: singleton ? node : [node, { ...node, path: "/test/other" }]
    };
    const result = loadModule("services/result/result.es6", {
      "/lib/xp/node": {
        connect: () => ({ get: () => ({ _path: "/content/test/page", _id: "content" }) })
      },
      "/lib/xp/auth": {},
      "/lib/cache": { newCache: () => ({ get: (_, callback) => callback() }) },
      "/lib/utils": {
        getResultRepoConnection: () => ({
          findChildren: () => ({ hits: [{ id: "report" }] }),
          get: () => ({ data })
        })
      }
    });
    const response = result.get({ params: { branch: "draft", start: "0", count: "20" } });
    assert.equal(response.body.total, singleton ? 1 : 2);
    assert.equal(response.body.hits[0].brokenLinks[0].status, 404);
  });
}

test("updating a report preserves its ID so indexed hits stay readable", () => {
  const stored = { _id: "existing-report", data: { results: [{ path: "/old" }] } };
  let modified = false;
  const utils = loadModule("lib/utils.es6", {
    "/lib/xp/repo": {},
    "/lib/xp/context": {},
    "/lib/xp/content": {},
    "/lib/xp/io": {},
    "/lib/xp/node": {
      connect: () => ({
        exists: () => true,
        modify({ key, editor }) {
          assert.equal(key, "/com.enonic.cms.test__test__draft");
          const updated = editor(stored);
          assert.equal(updated._id, "existing-report");
          assert.equal(updated.data.results[0].path, "/new");
          assert.equal(updated.data.brokenCount, 1);
          modified = true;
        },
        delete: () => assert.fail("Deleting a report invalidates indexed hits"),
        create: () => assert.fail("Existing reports must be updated in place")
      })
    }
  }, { log: { info() {} } });
  utils.saveResults([{ path: "/new" }], { _name: "test", _id: "site" }, "com.enonic.cms.test", "draft");
  assert.equal(modified, true);
});
