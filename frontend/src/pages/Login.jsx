import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── WebGL Shaders ──
const vertexSource = `
  attribute vec4 a_position;
  void main() { gl_Position = a_position; }
`;

const fragmentSource = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
    float time = iTime * 0.5;
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;
    vec2 d = centeredUV;
    for (float i = 1.0; i < 8.0; i++) {
        d.x += 0.5 / i * cos(i * 2.0 * d.y + time + rippleCenter.x * 3.1415);
        d.y += 0.5 / i * cos(i * 2.0 * d.x + time + rippleCenter.y * 3.1415);
    }
    float wave = abs(sin(d.x + d.y + time));
    float glow = smoothstep(0.9, 0.2, wave);
    fragColor = vec4(u_color * glow, 1.0);
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
`;

// ── Smokey Background ──
function SmokeyBackground({ color = '#00736B' }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, hovering: false });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'iResolution');
    const uTime = gl.getUniformLocation(prog, 'iTime');
    const uMouse = gl.getUniformLocation(prog, 'iMouse');
    const uColor = gl.getUniformLocation(prog, 'u_color');

    const r = parseInt(color.substring(1, 3), 16) / 255;
    const g2 = parseInt(color.substring(3, 5), 16) / 255;
    const b = parseInt(color.substring(5, 7), 16) / 255;
    gl.uniform3f(uColor, r, g2, b);

    const t0 = Date.now();
    function render() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, (Date.now() - t0) / 1000);
      const m = mouseRef.current;
      gl.uniform2f(uMouse, m.hovering ? m.x : w / 2, m.hovering ? h - m.y : h / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onEnter = () => { mouseRef.current.hovering = true; };
    const onLeave = () => { mouseRef.current.hovering = false; };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [color]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
    </div>
  );
}

// ── Floating Label Input ──
function FloatingInput({ id, type, icon, label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div style={{ position: 'relative', marginBottom: 32 }}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 0',
          fontSize: 14,
          color: 'var(--cbrio-text)',
          background: 'transparent',
          border: 'none',
          borderBottom: `2px solid ${focused ? '#00B39D' : 'var(--cbrio-border)'}`,
          outline: 'none',
          transition: 'border-color 0.3s',
          boxSizing: 'border-box',
        }}
      />
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          top: active ? -8 : 10,
          left: 0,
          fontSize: active ? 11 : 14,
          color: focused ? '#00B39D' : 'var(--cbrio-text3)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon}
        {label}
      </label>
    </div>
  );
}

// ── SVG Icons ──
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5 11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5 16.318 2.5 9.642 6.723 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
  </svg>
);
const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 23 23">
    <rect fill="#F25022" x="1" y="1" width="10" height="10" />
    <rect fill="#7FBA00" x="12" y="1" width="10" height="10" />
    <rect fill="#00A4EF" x="1" y="12" width="10" height="10" />
    <rect fill="#FFB900" x="12" y="12" width="10" height="10" />
  </svg>
);

// ── Main Login Component ──
export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  async function handleEmail(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) return setError(err.message);
    navigate('/');
  }

  async function handleOAuth(provider) {
    setError('');
    const fn = provider === 'google' ? signInWithGoogle : signInWithMicrosoft;
    const { error: err } = await fn();
    if (err) setError(err.message);
  }

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: 'var(--cbrio-bg)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <SmokeyBackground color="#00736B" />

      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 16,
      }}>
        {/* Glass Card */}
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: '40px 36px',
          background: 'var(--cbrio-card)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid var(--cbrio-border)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.15)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⛪</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--cbrio-text)', margin: 0 }}>CBRio ERP</h2>
            <p style={{ fontSize: 13, color: 'var(--cbrio-text3)', marginTop: 6 }}>Sistema de gestao interna</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmail}>
            <FloatingInput
              id="email"
              type="email"
              icon={<UserIcon />}
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FloatingInput
              id="password"
              type="password"
              icon={<LockIcon />}
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 20px',
                background: btnHover ? '#009985' : '#00B39D',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.3s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowIcon />}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            gap: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--cbrio-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--cbrio-text3)', textTransform: 'uppercase', letterSpacing: 1 }}>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: 'var(--cbrio-border)' }} />
          </div>

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <OAuthButton icon={<GoogleIcon />} label="Google" onClick={() => handleOAuth('google')} />
            <OAuthButton icon={<MicrosoftIcon />} label="Microsoft" onClick={() => handleOAuth('microsoft')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OAuthButton({ icon, label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '11px 16px',
        background: hover ? 'var(--cbrio-input-bg)' : 'var(--cbrio-modal-bg)',
        border: '1px solid var(--cbrio-border)',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--cbrio-text2)',
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
