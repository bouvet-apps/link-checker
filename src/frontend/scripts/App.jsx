import React, {
  useEffect, useMemo, useState
} from "react";
import { useInView } from "react-intersection-observer";

import SiteFilter from "./components/SiteFilter";
import Select from "./components/Select";
import ContentResult from "./components/ContentResult";

import {
  SORT_FIELDS,
  SORT_DIRECTION,
  BRANCHES
} from "./constants";
import { ArrowDownZA, ArrowUpAZ, ArrowsUpToLine } from "./components/Icons";
import usei18nContext from "./context/i18nContext";
import Header from "./components/Header";
import Spinner from "./components/Spinner";
import ProgressBar from "./components/ProgressBar";

const PER_BATCH = 20;

const DEFAULT_LOGS_STATE = {
  hits: [],
  total: 0,
  branchTotal: 0,
  sites: []
};

const App = ({
  api, lastRun, appVersion, inProgress
}) => {
  const { t } = usei18nContext();

  const sortOptions = [
    {
      value: SORT_FIELDS.NUM_BROKEN,
      label: t("sort-by.count")
    },
    {
      value: SORT_FIELDS.MODIFIED,
      label: t("sort-by.modified")
    }
  ];

  const [direction, setDirection] = useState(SORT_DIRECTION.DESCENDING);
  const [sortField, setSortField] = useState(sortOptions[0]);
  const [siteFilter, setSiteFilter] = useState([]);
  const [activeTab, setActiveTab] = useState(BRANCHES.DRAFT);

  const [state, setState] = useState("init");

  const [logs, setLogs] = useState(DEFAULT_LOGS_STATE);
  const [start, setStart] = useState();

  const [refreshKey, setRefreshKey] = useState(0);

  const [taskProgressCurrent, setTaskProgressCurrent] = useState();
  const [taskProgressTotal, setTaskProgressTotal] = useState();
  const [taskProgressInfo, setTaskProgressInfo] = useState();

  const refreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(api.checkTaskStatus, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId })
      });
      const data = await response.json();
      console.log(data);

      setTaskProgressTotal(data.progress.total);
      setTaskProgressCurrent(data.progress.current);
      setTaskProgressInfo(data.progress.info);

      if (data.state === "FINISHED") {
        refreshData();
      } else {
        setTimeout(() => {
          checkTaskStatus(taskId);
        }, 100); // Retry after 100ms
      }
    } catch (error) {
      console.error("Task status error:", error);
      // TODO: Add possibility for retries
    }
  };

  useEffect(() => {
    // Reset list
    setLogs(DEFAULT_LOGS_STATE);
    setStart({ value: -PER_BATCH });
  }, [sortField, direction, siteFilter, activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (!start) return;
      setState("loading");

      let params = `start=${start.value + PER_BATCH}&count=${PER_BATCH}&branch=${activeTab}`;
      if (siteFilter.length > 0) params += `&filter=${siteFilter.map((s) => s.value).join(",")}`;
      if (sortField?.value) params += `&sort=${sortField.value}`;
      if (direction) params += `&sortDirection=${direction}`;

      const result = await fetch(`${api.result}?${params}`);
      const data = await result.json();

      // Reset
      if (start.value === -PER_BATCH) setLogs(data);
      else {
        // append
        setLogs((prev) => ({
          ...data,
          hits: [...prev.hits, ...data.hits]
        }));
      }

      // Add small delay to prevent intersection observer from firing too early
      // we want the list of new items to be rendered before observer is activated
      setTimeout(() => {
        setState("idle");
      }, 300);
    };

    fetchData();
  }, [start, refreshKey]);

  const [intersectionRef, inView] = useInView();
  useEffect(() => {
    if (inView && state === "idle") {
      setStart((prev) => {
        const newValue = prev.value + PER_BATCH;
        if (newValue + PER_BATCH >= logs.total) return prev;

        return { value: newValue };
      });
    }
  }, [inView, state]);

  const siteOptions = useMemo(() => [
    ...Object.entries(logs.sites).map(([key, { displayName, id, icon }]) => ({
      value: key,
      label: displayName,
      id,
      icon
    }))
  ], [logs.sites]);

  const closeAllAccordions = () => {
    document.dispatchEvent(new Event("close-accordion"));
  };

  // TODO: get total of both branches. Not done currently since didnt want to load all reports into memeory in controller
  const totalLogs = logs.branchTotal;

  const hasBeenRun = lastRun;

  return (
    <div className="w-full h-full">
      <Header appVersion={appVersion} inProgress={inProgress} api={api} checkTaskStatus={checkTaskStatus} />
      {!hasBeenRun && (
        <div className="container text-xl">
          {t("not-run")}
        </div>
      )}
      {hasBeenRun && (
        <>
          <div className="container flex justify-between flex-wrap flex-col gap-2">
            <div className="flex gap-6 flex-row flex-wrap items-center">
              <span className="text-xl">
                {t("found")}
                {" "}
                <span className={`${totalLogs > 0 ? "text-red-600" : "text-green-400"} font-bold`}>{totalLogs}</span>
                {" "}
                {t("with-broken")}
              </span>
              <div className="flex-1 flex">
                <ProgressBar styles="justify-end" current={taskProgressCurrent} total={taskProgressTotal} info={taskProgressInfo} />
              </div>
            </div>
            <span className="text-base text-gray-600 flex-1">
              {t("last-run")}
              {" "}
              {new Date(lastRun).toLocaleString(t.locale === "en" ? "en-GB" : "no")}
            </span>
          </div>
          <div className="container mt-10 flex gap-3">
            <div className="flex flex-col flex-1">
              {t("filter-site")}
              <SiteFilter
                options={siteOptions}
                selected={siteFilter}
                searchable
                onChange={(v) => setSiteFilter(v)}
              />
            </div>
            <div className="flex flex-col">
              {t("sort-by")}
              <div className="flex gap-2 items-center">
                <Select
                  options={sortOptions}
                  value={sortField}
                  onChange={(v) => setSortField(v)}
                />
                <button onClick={() => setDirection((_d) => (_d === SORT_DIRECTION.ASCENDING ? SORT_DIRECTION.DESCENDING : SORT_DIRECTION.ASCENDING))}>
                  {direction === SORT_DIRECTION.DESCENDING && <ArrowDownZA className="w-6 h-6 inline-block" />}
                  {direction === SORT_DIRECTION.ASCENDING && <ArrowUpAZ className="w-6 h-6 inline-block" />}
                </button>
              </div>
            </div>
          </div>
          <div className="container mt-8 flex justify-between w-full gap-4">
            <div className={`w-2/3 rounded-md shadow-md overflow-hidden tab-buttons ${activeTab === BRANCHES.DRAFT ? "tab-left" : "tab-right"}`}>
              <div className="flex items-center relative z-[2]">
                <button
                  onClick={() => setActiveTab(BRANCHES.DRAFT)}
                  className="block w-1/2 p-4 transition-all !border-r-0"
                >
                  {t("draft-tab")}
                </button>
                <button
                  onClick={() => setActiveTab(BRANCHES.MASTER)}
                  className="block w-1/2 p-4 transition-all !border-l-0"
                >
                  {t("master-tab")}
                </button>
              </div>
            </div>
            <button onClick={closeAllAccordions} className="flex items-center p-4 rounded-md shadow-md text-white bg-slate-500">
              <span>{t("close-accordion")}</span>
              <ArrowsUpToLine fill="white" className="ml-2 w-6 h-6 inline-block" />
            </button>
          </div>
          <div className="container mt-6 gap-6 flex flex-col">
            {(logs.total === 0 && state === "idle") && (
              <>
                {logs.branchTotal.length > 0 && (
                  <div>{t("filter.empty")}</div>
                )}
                {logs.branchTotal === 0 && (
                  <div>{t("filter.empty-branch")}</div>
                )}
              </>
            )}
            {logs.hits.map((result) => <ContentResult key={result.path + result.repo} result={result} api={api} onRefresh={refreshData} />)}
            {state === "loading" && (
              <Spinner />
            )}

            <div ref={intersectionRef} />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
