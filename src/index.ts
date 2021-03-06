import "./style/index.css";
import "./style/md-icons.css";
import App from "./components/app";
import { inspect } from "@xstate/inspect";

if (process.env.NODE_ENV !== "production") {
  inspect({
    iframe: false,
  });
}

export default App;
