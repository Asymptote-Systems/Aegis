import { testBackendConnection } from "./api/test";
import React, { useEffect, useState } from "react";

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
      testBackendConnection()
        .then(data => setMessage(data.message))
        .catch(err => console.error(err));
    }, []);
  return (
    <>
    {message}
    </>
  );
}

export default App;
