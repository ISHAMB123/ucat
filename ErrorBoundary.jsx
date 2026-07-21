import React from "react";

/* ------------------------------ ERROR BOUNDARY -------------------- */
/* One component throwing used to white out the whole site. This      */
/* catches a render error anywhere below it and shows a recovery      */
/* screen instead of a blank page. Styles are inline and self         */
/* contained, so the fallback still renders even when the app's own   */
/* stylesheet never mounted.                                          */

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, message: error && error.message ? error.message : "Something went wrong." };
  }

  componentDidCatch(error, info) {
    /* Kept to the console for now. When error reporting is wired, send
       error and info.componentStack here. No user data is included. */
    console.error("Tempo caught a render error:", error, info && info.componentStack);
  }

  handleReload = () => {
    if (typeof window !== "undefined" && window.location && window.location.reload) {
      window.location.reload();
    } else {
      this.setState({ failed: false, message: "" });
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;

    const wrap = {
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0E1319", color: "#EDEFF2", padding: "24px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    };
    const card = {
      maxWidth: "440px", width: "100%", background: "#18202B", border: "1px solid #2A3441",
      borderRadius: "4px", padding: "28px 26px", textAlign: "left",
    };
    const button = {
      marginTop: "18px", background: "#F5A524", color: "#131A22", border: "none",
      borderRadius: "3px", padding: "11px 18px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
    };

    return (
      <div style={wrap}>
        <div style={card} role="alert">
          <p style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#F5A524", margin: "0 0 14px" }}>Tempo</p>
          <h1 style={{ fontSize: "20px", margin: "0 0 10px", fontWeight: 700 }}>This screen hit a problem</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#C0CAD6", margin: 0 }}>
            Your saved progress is untouched. Reloading usually clears it. If it keeps happening,
            it would help me to know which screen you were on.
          </p>
          <button style={button} onClick={this.handleReload}>Reload Tempo</button>
        </div>
      </div>
    );
  }
}
