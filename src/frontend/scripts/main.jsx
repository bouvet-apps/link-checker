
import { createRoot } from "react-dom/client";
import App from "./App";
import NoLogs from "./noLogs";


const domNode = document.getElementById("app-root");
const logs = JSON.parse(domNode.dataset.log);
const taskPerformed = JSON.parse(domNode.dataset.task);

const root = createRoot(domNode);

root.render(logs.length > 0 ? <App logArray={logs} /> : <NoLogs taskPerformed={taskPerformed} />);
