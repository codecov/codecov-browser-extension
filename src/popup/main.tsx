import React from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

const Popup = () => {
  return (
    <div data-theme="light">
      <div className="navbar bg-primary flex justify-between">
        <a
          className="btn btn-ghost normal-case text-lg text-white"
          href="https://about.codecov.io/"
          target="_blank"
        >
          Codecov
        </a>
        {/*<div className="pr-4">*/}
        {/*  <FontAwesomeIcon icon={faCircleNotch} spin color="white" size="xl" />*/}
        {/*</div>*/}
      </div>
      <div className="w-[28rem]">
        <div className="p-6">WIP</div>
      </div>
    </div>
  );
};

createRoot(document.getElementById("app")!).render(<Popup />);
