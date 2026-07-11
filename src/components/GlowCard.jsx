export const GlowCard = ({ children, className = "", as: Tag = "div", ...rest }) => {
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--glow-x", `${x}%`);
    e.currentTarget.style.setProperty("--glow-y", `${y}%`);
  };

  return (
    <Tag
      className={`glow-card ${className}`}
      onMouseMove={handleMouseMove}
      {...rest}
    >
      <span className="glow-card-shine" />
      {children}
    </Tag>
  );
};
