import React from "react";
import Button from "./Button";
export default function Summary({ liked, onRestart }) {
return (
<div className="summary">
<h2>¡Has terminado!</h2>
{liked.length ? (
<>
<p className="muted">Te han gustado:</p>
<ul className="list">
{liked.map(x => (
<li key={x.id} className="list__item">
<img src={x.img} alt="" />
<div>
<div className="name">{x.name}</div>
<div className="small">{x.cuisine.join(" · ")} · {"$".repeat(x.price)} · ⭐ {x.rating.toFixed(1)}</div>
</div>
</li>
))}
</ul>
</>
) : (
<p className="muted">No has dado "sí" a ninguno esta vez.</p>
)}
<div className="summary__actions">
<Button variant="ghost" onClick={onRestart}>Reiniciar</Button>
</div>
</div>
);
}