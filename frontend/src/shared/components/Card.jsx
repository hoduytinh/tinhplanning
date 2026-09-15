export default function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-card ${
        hover
          ? "transition-all duration-200 hover:border-brand hover:shadow-cardHover"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
