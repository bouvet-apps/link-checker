import React from "react";
import cn from "classnames";

const Header = ({
  appVersion, inProgress, api, checkTaskStatus
}) => {
  const triggerFullCheck = async () => {
    if (inProgress) return;

    const res = await fetch(api.trigger, { method: "POST" });
    const data = await res.json();
    const status = res.status;
    if (status === 409) {
      alert("Check already running");
      return;
    }
    if (status !== 200) {
      alert("Failed to start task");
      return;
    }

    checkTaskStatus(data.taskId);
  };

  return (
    <header className="w-full h-16 bg-blue-900 text-white flex items-center shadow-lg mb-4">
      <div className="w-full container flex items-center justify-between">
        <h1 className="text-3xl uppercase flex-1">
          <span className="text-4xl">L</span>
          ink
          <span className="text-4xl">c</span>
          hecker
        </h1>
        <div className="flex-1">
          <button
            onClick={triggerFullCheck}
            disabled={inProgress}
            className={cn("bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700 transition-all shadow-md block mx-auto", {
              "opacity-50 cursor-not-allowed": inProgress
            })}
          >
            {inProgress ? "Check in progress..." : "Run full check"}
          </button>
        </div>
        <div className="text-gray-400 flex-1 text-right" title="Made with <3 by Bouvet">
          v
          {appVersion}
        </div>
      </div>
    </header>
  );
};

export default Header;
