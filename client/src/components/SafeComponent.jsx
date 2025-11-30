import React from 'react';

function resolveComponent(Comp) {
  if (!Comp) return null;
  if (typeof Comp === 'function') return Comp;
  if (typeof Comp === 'object' && Comp.default && typeof Comp.default === 'function') return Comp.default;
  return null;
}

const SafeComponent = ({ Comp, label = 'Component', children, ...props }) => {
  const Resolved = resolveComponent(Comp);
  if (!Resolved) {
    const info = {
      label,
      type: typeof Comp,
      isArray: Array.isArray(Comp),
      hasDefault: Comp && Object.prototype.hasOwnProperty.call(Comp, 'default'),
      defaultType: Comp && Comp.default ? typeof Comp.default : null,
      keys: Comp && Object.keys(Comp || {}),
      constructorName: Comp && Comp.constructor && Comp.constructor.name
    };

    return (
      <div style={{ padding: 20, color: '#800' }}>
        <h3>Rendering error</h3>
        <p>The requested component <strong>{label}</strong> is not a valid React component.</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(info, null, 2)}</pre>
      </div>
    );
  }

  return <Resolved {...props}>{children}</Resolved>;
};

export default SafeComponent;
