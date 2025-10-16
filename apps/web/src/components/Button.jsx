// apps/web/src/components/Button.jsx
import React from "react";
export default function Button({ children, variant = "primary", ...rest }) {
const className = [
"btn",
variant === "primary" && "btn--primary",
variant === "ghost" && "btn--ghost",
variant === "yes" && "btn--yes",
variant === "no" && "btn--no",
].filter(Boolean).join(" ");
return (
<button className={className} {...rest}>{children}</button>
);
}