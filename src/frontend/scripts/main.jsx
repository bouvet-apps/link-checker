
import { createRoot } from "react-dom/client";
import App from "./App";


const domNode = document.getElementById("app-root");
const logs = JSON.parse(domNode.dataset.log);


const root = createRoot(domNode);
root.render(<App logArray={logs} />);
