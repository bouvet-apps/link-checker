import React, {
  createContext, useContext, useMemo, useState
} from "react";
import Modal from "react-modal";

Modal.setAppElement("#app-root");

const Context = createContext("");

const useModalContext = () => useContext(Context);
export default useModalContext;

const ModalContext = ({ children }) => {
  const [modalText, setModalText] = useState("");

  const value = useMemo(() => ({
    modalText,
    setModalText
  }), [modalText, setModalText]);
  return (
    <>
      <Context.Provider value={value}>
        {children}
      </Context.Provider>
      <Modal
        isOpen={!!modalText}
        onRequestClose={() => setModalText(false)}
        style={{
          overlay: {
            cursor: "pointer"
          },
          content: {
            cursor: "default",
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            width: "80%",
            maxWidth: "800px",
            padding: "0",
            border: "1px solid #ccc"
          }
        }}
      >
        <div className="p-4" dangerouslySetInnerHTML={{ __html: modalText }} />
      </Modal>
    </>
  );
};

export {
  ModalContext
};
