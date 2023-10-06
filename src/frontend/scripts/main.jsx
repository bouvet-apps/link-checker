
import { createRoot } from "react-dom/client";
import App from "./App";


const domNode = document.getElementById("app-root");
const logs = domNode.dataset.log;
const root = createRoot(domNode);
root.render(<App logs={{ logs }} />);
