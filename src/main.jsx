import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const allowedDomains = ["moneyfast.cc", "www.moneyfast.cc"];

const currentDomain = window.location.hostname;
if (!allowedDomains.includes(currentDomain)) {
  document.body.innerHTML = "<h1>Unauthorized domain</h1>";
  throw new Error("This build is not authorized for this domain.");
}


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
