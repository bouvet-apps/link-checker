import { createRoot } from "react-dom/client";
import App from "./App";
import { i18nContext } from "./context/i18nContext";
import { ModalContext } from "./context/modalContext";

const domNode = document.getElementById("app-root");
const root = createRoot(domNode);

const propNode = document.getElementById("app-props");
const props = JSON.parse(propNode.textContent);

const ContextWrappers = ({ i18n, ...rest }) => (
  <i18nContext.Provider value={i18n}>
    <ModalContext>
      <App {...rest} />
    </ModalContext>
  </i18nContext.Provider>
);

root.render(<ContextWrappers {...props} />);
