// apps/web/src/components/Button.jsx
import React from "react";
export default function Button({ children, variant = "primary", size, className: extra, ...rest }) {
	const className = [
		"btn",
		variant === "primary" && "btn--primary",
		variant === "ghost" && "btn--ghost",
		variant === "yes" && "btn--yes",
		variant === "no" && "btn--no",
		size === "mini" && "btn--mini",
		extra,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<button className={className} {...rest}>{children}</button>
	);
}