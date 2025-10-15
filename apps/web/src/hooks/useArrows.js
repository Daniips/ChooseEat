import { useEffect } from "react";
export function useArrows(map, deps = []) {
useEffect(() => {
const handler = (e) => {
if (e.key === "ArrowLeft" && map.left) map.left();
if (e.key === "ArrowRight" && map.right) map.right();
};
window.addEventListener("keydown", handler);
return () => window.removeEventListener("keydown", handler);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, deps);
}